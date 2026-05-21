const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// multer — memory storage, 10 MB limit, images + PDFs only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)|application\/pdf$/.test(file.mimetype);
    cb(ok ? null : new Error("Only images and PDFs are accepted."), ok);
  },
});

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "coverfight.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    denial_type TEXT,
    insurer TEXT,
    procedure TEXT,
    denial_reason TEXT,
    amount REAL,
    policy_id TEXT,
    patient_name TEXT,
    doctor_name TEXT,
    specialty TEXT,
    notes TEXT,
    status TEXT DEFAULT 'New',
    analysis TEXT,
    letter TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Email ─────────────────────────────────────────────────────────────────────
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "CoverFight <noreply@coverfight.ai>";

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({ service: "gmail", auth: { user: EMAIL_USER, pass: EMAIL_PASS } })
  : null;

async function sendEmail(to, subject, body, attachment) {
  if (transporter) {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text: body,
      attachments: attachment ? [{ filename: "appeal-letter.txt", content: attachment }] : [],
    });
    console.log(`[EMAIL] Sent to ${to} — "${subject}"`);
  } else {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`[EMAIL LOG] (set EMAIL_USER + EMAIL_PASS to send for real)`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    if (attachment) console.log(`\nAttachment: appeal-letter.txt (${attachment.length} chars)`);
    console.log("─".repeat(60) + "\n");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_KEY = "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";

function parseCase(c) {
  let analysis = null, notes = {};
  try { analysis = c.analysis ? JSON.parse(c.analysis) : null; } catch {}
  try { notes = c.notes ? JSON.parse(c.notes) : {}; } catch {}
  return { ...c, analysis, notes };
}

async function callAnthropic(body) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
}

async function readSSEChunks(resp, onChunk) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const j = JSON.parse(line.slice(6));
        if (j.type === "content_block_delta" && j.delta?.text) { full += j.delta.text; onChunk(j.delta.text); }
      } catch {}
    }
  }
  return full;
}

// ── Timeline tracker ──────────────────────────────────────────────────────────
function trackTimeline(caseId, event) {
  try {
    const row = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
    let notes = {};
    try { notes = row?.notes ? JSON.parse(row.notes) : {}; } catch {}
    const timeline = notes.timeline || [];
    timeline.push({ event, ts: new Date().toISOString() });
    notes.timeline = timeline;
    db.prepare("UPDATE cases SET notes = ? WHERE id = ?").run(JSON.stringify(notes), caseId);
  } catch (err) {
    console.error(`[CASE ${caseId}] trackTimeline failed:`, err.message);
  }
}

// ── Background case processor (customer submit flow) ──────────────────────────
async function processCase(caseId, email, denialFile) {
  console.log(`[CASE ${caseId}] Starting background processing for ${email}`);

  trackTimeline(caseId, "Case received and queued for processing");

  // 0. Vision extraction — read the denial letter image if provided
  let visionContext = "";
  if (denialFile) {
    try {
      const isImage = denialFile.mimetype.startsWith("image/");
      if (isImage) {
        trackTimeline(caseId, "Denial letter image received — extracting details via AI vision");
        const base64 = denialFile.buffer.toString("base64");
        const vResp = await callAnthropic({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: denialFile.mimetype, data: base64 } },
              { type: "text", text: "This is an insurance denial letter. Extract all relevant information you can see: patient name, member/policy ID, claim number, denial date, insurer name, procedure or treatment denied, diagnosis codes, and the exact denial reason text. Format as a concise structured list." },
            ],
          }],
        });
        const vData = await vResp.json();
        visionContext = vData.content?.[0]?.text || "";
        if (visionContext) {
          trackTimeline(caseId, "Denial letter analyzed — key fields extracted from image");
          // Persist extracted context into notes
          const row2 = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
          let notes2 = {};
          try { notes2 = row2?.notes ? JSON.parse(row2.notes) : {}; } catch {}
          notes2.visionExtract = visionContext;
          db.prepare("UPDATE cases SET notes = ? WHERE id = ?").run(JSON.stringify(notes2), caseId);
        }
      }
    } catch (err) {
      console.error(`[CASE ${caseId}] Vision extraction failed:`, err.message);
    }
  }

  // 1. Analyze
  db.prepare("UPDATE cases SET status = 'Analyzing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);
  trackTimeline(caseId, "Denial analysis started");
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
  const c = parseCase(row);

  const analysisPrompt = `Analyze this insurance denial. Return ONLY a raw JSON object with these exact keys:
summary, strategy, winProbability, urgency, keyArgs, nextSteps, timeframe, escalationPath, legalCitations, evidenceNeeded

- summary: 1 sentence
- strategy: 2-3 sentences on best appeal approach
- winProbability: integer 0-100
- urgency: "low", "medium", or "high"
- keyArgs: array of 4-5 strings
- nextSteps: array of 5-6 ordered action strings
- timeframe: string like "30-60 days"
- escalationPath: array of 3 strings
- legalCitations: array of 3-4 law citation strings
- evidenceNeeded: array of 3-5 strings

Denial:
Patient: ${c.notes?.patientName || "Unknown"}
Insurer: ${c.insurer}
Procedure: ${c.procedure}
Reason: ${c.denial_reason}${visionContext ? `\n\nAdditional details extracted from denial letter image:\n${visionContext}` : ""}`;

  let analysis;
  try {
    const aResp = await callAnthropic({
      model: "claude-sonnet-4-20250514", max_tokens: 1500, stream: false,
      system: "You are an expert insurance appeals attorney. Return ONLY raw JSON, no markdown.",
      messages: [{ role: "user", content: analysisPrompt }],
    });
    const aData = await aResp.json();
    analysis = JSON.parse((aData.content?.[0]?.text || "").replace(/```json|```/g, "").trim());
  } catch {
    analysis = {
      summary: "Strong grounds for appeal based on medical necessity.",
      strategy: "Challenge the denial on medical necessity grounds citing clinical guidelines. Request peer-to-peer review. Invoke ACA external review rights.",
      winProbability: 68, urgency: "medium",
      keyArgs: ["Medical necessity not properly evaluated", "Clinical guidelines support this treatment", "Conservative options may have been exhausted", "Reviewer may lack relevant specialty certification"],
      nextSteps: ["File formal internal appeal within 180 days", "Request peer-to-peer review", "Obtain letter of medical necessity", "Request reviewer names and credentials", "Gather supporting medical records", "Set 30-day response deadline"],
      timeframe: "30-90 days",
      escalationPath: ["Request independent external review (federally mandated)", "File complaint with state insurance commissioner", "Consult a patient advocate or healthcare attorney"],
      legalCitations: ["ACA Section 2719", "ERISA Section 503", "45 CFR 147.136", "HIPAA Section 164"],
      evidenceNeeded: ["Letter of medical necessity", "Clinical literature supporting procedure", "Prior treatment records", "Specialist evaluation", "Insurer's own clinical coverage criteria"],
    };
  }
  db.prepare("UPDATE cases SET analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(analysis), caseId);
  trackTimeline(caseId, `Denial analyzed — win probability ${analysis.winProbability ?? "?"}%, urgency: ${analysis.urgency ?? "unknown"}`);

  // 2. Generate letter (non-streaming for background)
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  // Re-read notes in case vision context was added after case creation
  const freshRow = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
  let freshNotes = {};
  try { freshNotes = freshRow?.notes ? JSON.parse(freshRow.notes) : {}; } catch {}
  const patientName = freshNotes.patientName || c.notes?.patientName || "[Patient Name]";
  const latestVision = freshNotes.visionExtract || visionContext;

  const letterPrompt = `Write a complete formal insurance appeal letter.

Date: ${today}
Patient Name: ${patientName}
Insurance Company: ${c.insurer}
Procedure Denied: ${c.procedure}
Denial Reason: ${c.denial_reason}${latestVision ? `\n\nAdditional details from denial letter:\n${latestVision}` : ""}

Key Arguments: ${(analysis.keyArgs || []).join("; ")}
Legal Citations: ${(analysis.legalCitations || []).join(", ")}

Write the full letter including:
1. Formal header addressed to the insurer
2. Clear appeal statement citing the specific denial
3. Medical necessity argument with clinical evidence references
4. Cite exact law sections (ACA Section 2719, ERISA Section 503)
5. Demand names and credentials of all reviewers
6. Request peer-to-peer review with treating physician and medical director
7. Reference ACA right to independent external review
8. Hard 30-day response deadline
9. List of enclosures
10. Professional signature block with [PATIENT NAME] placeholder`;

  let letter = "";
  try {
    const lResp = await callAnthropic({
      model: "claude-sonnet-4-20250514", max_tokens: 2000, stream: false,
      system: "You are an expert insurance appeals attorney. Write formal, legally precise, assertive appeal letters that win.",
      messages: [{ role: "user", content: letterPrompt }],
    });
    const lData = await lResp.json();
    letter = lData.content?.[0]?.text || "";
  } catch (err) {
    console.error(`[CASE ${caseId}] Letter generation failed:`, err.message);
  }

  db.prepare("UPDATE cases SET letter = ?, status = 'Letter Sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(letter, caseId);
  trackTimeline(caseId, "Appeal letter drafted and saved");

  // 3. Email
  const emailBody = `Hi,

Your insurance appeal letter for the denial of "${c.procedure}" by ${c.insurer} is attached and ready to send.

Next steps:
1. Fill in your name where indicated in the letter
2. Send it to your insurance company via certified mail AND email
3. Keep a copy for your records
4. Follow up in 30 days if you don't hear back

You have the right to appeal — and this letter is built to win.

— The CoverFight Team`;

  await sendEmail(email, `Your Appeal Letter is Ready — ${c.insurer} / ${c.procedure}`, emailBody, letter);
  trackTimeline(caseId, `Letter emailed to ${email}`);
  console.log(`[CASE ${caseId}] Processing complete.`);
}

// ── Customer: Submit ──────────────────────────────────────────────────────────
app.post("/api/submit", upload.single("denialLetter"), async (req, res) => {
  const { name, insurer, procedure, denialReason, email } = req.body;
  if (!insurer || !procedure || !denialReason || !email) {
    return res.status(400).json({ error: "All fields are required." });
  }
  try {
    const notes = {
      patientEmail: email,
      patientName: name || undefined,
      hasDenialLetter: !!req.file,
      denialLetterMime: req.file?.mimetype || undefined,
    };
    const result = db.prepare(`
      INSERT INTO cases (insurer, procedure, denial_reason, status, notes)
      VALUES (?, ?, ?, 'Processing', ?)
    `).run(insurer, procedure, denialReason, JSON.stringify(notes));

    const caseId = result.lastInsertRowid;
    res.json({ id: caseId, status: "Processing" });

    // Fire-and-forget — pass file buffer so vision can use it in background
    processCase(caseId, email, req.file || null).catch((err) => {
      console.error(`[CASE ${caseId}] Fatal error:`, err.message);
      db.prepare("UPDATE cases SET status = 'Error', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Customer: Status ──────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email query param required" });
  try {
    const rows = db.prepare("SELECT * FROM cases ORDER BY created_at DESC").all();
    const cases = rows.map(parseCase).filter((c) => c.notes?.patientEmail === email);
    res.json(cases.map((c) => ({
      id: c.id, status: c.status, procedure: c.procedure,
      insurer: c.insurer, created_at: c.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Cases CRUD ─────────────────────────────────────────────────────────
app.get("/api/cases", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM cases ORDER BY created_at DESC").all().map(parseCase));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/cases", (req, res) => {
  try {
    const { denial_type, insurer, procedure, denial_reason, amount, policy_id, patient_name, doctor_name, specialty, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO cases (denial_type, insurer, procedure, denial_reason, amount, policy_id, patient_name, doctor_name, specialty, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(denial_type, insurer, procedure, denial_reason, amount != null ? Number(amount) : null,
           policy_id, patient_name, doctor_name, specialty, notes ? JSON.stringify(notes) : null);
    res.json(parseCase(db.prepare("SELECT * FROM cases WHERE id = ?").get(result.lastInsertRowid)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/cases/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(parseCase(row));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/api/cases/:id", (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const allowed = ["status", "analysis", "letter", "notes"];
    const sets = [], vals = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = ?`);
        const v = req.body[key];
        vals.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v);
      }
    }
    if (sets.length) db.prepare(`UPDATE cases SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...vals, req.params.id);
    res.json(parseCase(db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin: AI endpoints (streaming, for admin UI) ─────────────────────────────
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { caseId } = req.body;
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
    if (!row) return res.status(404).json({ error: "Case not found" });
    const c = parseCase(row); const n = c.notes;

    const prompt = `Analyze this insurance denial. Return ONLY a raw JSON object with these exact keys:
summary, strategy, winProbability, urgency, keyArgs, nextSteps, timeframe, escalationPath, legalCitations, evidenceNeeded

- summary: 1 sentence
- strategy: 2-3 sentences
- winProbability: integer 0-100
- urgency: "low", "medium", or "high"
- keyArgs: array of 4-5 strings
- nextSteps: array of 5-6 strings
- timeframe: string like "30-60 days"
- escalationPath: array of 3 strings
- legalCitations: array of 3-4 strings
- evidenceNeeded: array of 3-5 strings

Procedure: ${c.procedure}, Type: ${c.denial_type}, Insurer: ${c.insurer}
Reason: ${c.denial_reason}, Amount: $${c.amount || "unknown"}
Doctor: ${c.doctor_name || "unknown"}, ${c.specialty || "unknown"}
Diagnosis: ${n.diagnosis || "unknown"}, History: ${n.medicalHistory || "none"}
Prior treatments: ${n.priorTreatments || "none"}`;

    const resp = await callAnthropic({ model: "claude-sonnet-4-20250514", max_tokens: 1500, stream: false,
      system: "You are an expert insurance appeals attorney. Return ONLY raw JSON.", messages: [{ role: "user", content: prompt }] });
    const data = await resp.json();
    let analysis;
    try { analysis = JSON.parse((data.content?.[0]?.text || "").replace(/```json|```/g, "").trim()); }
    catch { analysis = { summary: "Strong grounds for appeal.", strategy: "Challenge denial on medical necessity grounds.", winProbability: 68, urgency: "medium", keyArgs: [], nextSteps: [], timeframe: "30-90 days", escalationPath: [], legalCitations: ["ACA Section 2719", "ERISA Section 503"], evidenceNeeded: [] }; }

    db.prepare("UPDATE cases SET analysis = ?, status = 'Appeal Drafted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(analysis), caseId);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/ai/letter", async (req, res) => {
  try {
    const { caseId } = req.body;
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
    if (!row) return res.status(404).json({ error: "Case not found" });
    const c = parseCase(row); const n = c.notes; const a = c.analysis || {};

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const prompt = `Write a complete formal insurance appeal letter.

Patient: ${c.patient_name || "[Patient Name]"}
Address: ${n.patientAddress || "[ADDRESS]"}, Email: ${n.patientEmail || "[EMAIL]"}, Phone: ${n.patientPhone || "[PHONE]"}
Date: ${today}
Insurance Company: ${c.insurer}, Member ID: ${c.policy_id || "[ID]"}, Claim: ${n.claimNumber || "[CLAIM]"}, Plan: ${n.planName || "[PLAN]"}
Treating Physician: ${c.doctor_name || "Treating Physician"}, Phone: ${n.doctorPhone || "[PHONE]"}, Specialty: ${c.specialty || "MD"}
Procedure: ${c.procedure}, Denial Type: ${c.denial_type}, Denial Date: ${n.denialDate || "[DATE]"}
Denial Reason: ${c.denial_reason}
Diagnosis: ${n.diagnosis || "[DIAGNOSIS]"}, CPT: ${n.cptCodes || "on file"}
Medical History: ${n.medicalHistory || "[HISTORY]"}
Prior Treatments: ${n.priorTreatments || "[PRIOR TREATMENTS]"}
Key Arguments: ${(a.keyArgs || []).join("; ")}
Legal Citations: ${(a.legalCitations || []).join(", ")}

Write the full letter including: formal header, appeal statement, medical necessity argument, exact law citations, challenge reviewer credentials, demand peer-to-peer review, reference ACA external review, 30-day response deadline, enclosures, signature block.`;

    const resp = await callAnthropic({ model: "claude-sonnet-4-20250514", max_tokens: 2000, stream: true,
      system: "You are an expert insurance appeals attorney. Write formal, legally precise, assertive appeal letters that win.",
      messages: [{ role: "user", content: prompt }] });

    const full = await readSSEChunks(resp, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`));
    db.prepare("UPDATE cases SET letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(full, caseId);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, caseId } = req.body;
    let sys = "You are an expert insurance appeals attorney. Be concise and practical.";
    if (caseId) {
      const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
      if (row) { const c = parseCase(row); sys = `You are an expert insurance appeals attorney helping with a "${c.denial_type}" denial from ${c.insurer} for ${c.procedure}. Denial reason: "${c.denial_reason}". Be concise and practical.`; }
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const resp = await callAnthropic({ model: "claude-sonnet-4-20250514", max_tokens: 800, stream: true, system: sys, messages });
    await readSSEChunks(resp, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`));
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
