const { Router } = require("express");
const { db, parseCase, trackTimeline } = require("../db.cjs");
const { callAnthropic, readSSEChunks } = require("../anthropic.cjs");
const {
  APPROVED_CITATIONS, CITATION_LIST,
  ZERO_HALLUCINATION_BLOCK, CATEGORY_CONTEXT,
} = require("../prompts.cjs");
const { classifyDenial }   = require("../services/classifier.cjs");
const { adminAuth }        = require("../middleware.cjs");

const router = Router();

// ── Analyze ───────────────────────────────────────────────────────────────────
router.post("/ai/analyze", adminAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
    if (!row) return res.status(404).json({ error: "Not found" });
    const c = parseCase(row);
    const n = c.notes;

    const knownFacts = [
      c.procedure     && `Procedure: ${c.procedure}`,
      c.denial_type   && `Denial type: ${c.denial_type}`,
      c.insurer       && `Insurer: ${c.insurer}`,
      c.denial_reason && `Denial reason: ${c.denial_reason}`,
      c.amount        && `Amount: $${c.amount}`,
      c.doctor_name   && `Doctor: ${c.doctor_name}${c.specialty ? `, ${c.specialty}` : ""}`,
      n.diagnosis        && `Diagnosis: ${n.diagnosis}`,
      n.medicalHistory   && `Medical history: ${n.medicalHistory}`,
      n.priorTreatments  && `Prior treatments: ${n.priorTreatments}`,
      n.symptoms         && `Symptoms: ${n.symptoms}`,
      n.conditionDuration && `Duration: ${n.conditionDuration}`,
    ].filter(Boolean).join("\n");

    // Classify if not done
    let category = c.denial_category;
    if (!category && c.denial_reason) {
      const cls = await classifyDenial({ denialReason: c.denial_reason, procedure: c.procedure, insurer: c.insurer });
      category = cls.category;
      db.prepare("UPDATE cases SET denial_category = ? WHERE id = ?").run(category, caseId);
    }
    const ctx = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT.medical_necessity;

    const prompt = `Analyze this insurance denial. Return ONLY raw JSON with these keys:
summary, strategy, winProbability, urgency, keyArgs, nextSteps, timeframe, escalationPath, legalCitations, evidenceNeeded

DENIAL TYPE: ${ctx.appealType}
APPEAL APPROACH: ${ctx.approach}

Rules:
- summary: 1 sentence, confirmed facts only
- strategy: 2-3 sentences using APPEAL APPROACH
- winProbability: 0-100 calibrated to denial type
- urgency: "low" | "medium" | "high"
- keyArgs: 4-5 strings from confirmed facts only
- nextSteps: 5-6 ordered action strings
- timeframe: e.g. "30-60 days"
- escalationPath: 3 strings
- legalCitations: 2-4 strings from ONLY this list:
${CITATION_LIST}
- evidenceNeeded: 3-5 strings

CONFIRMED FACTS:
${knownFacts || "(minimal data — base analysis only on what is stated)"}`;

    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 1500, stream: false,
      system: "You are an expert insurance appeals attorney. Return ONLY raw JSON, no markdown. Base all analysis strictly on provided facts.",
      messages: [{ role: "user", content: prompt }],
    });
    const data = await resp.json();

    let analysis;
    try {
      analysis = JSON.parse((data.content?.[0]?.text || "").replace(/```json|```/g, "").trim());
    } catch {
      analysis = {
        summary: "Analysis failed — check server logs.", strategy: ctx.approach,
        winProbability: 65, urgency: "medium",
        keyArgs: [], nextSteps: [], timeframe: "30-90 days",
        escalationPath: [], legalCitations: APPROVED_CITATIONS.slice(0, 3), evidenceNeeded: [],
      };
    }

    db.prepare("UPDATE cases SET analysis = ?, status = 'Appeal Drafted', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(analysis), caseId);
    res.json({ ...analysis, denial_category: category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Letter (streaming) ────────────────────────────────────────────────────────
router.post("/ai/letter", adminAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
    if (!row) return res.status(404).json({ error: "Not found" });
    const c = parseCase(row);
    const n = c.notes;
    const a = c.analysis || {};

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Build denial category context
    const category = c.denial_category || "medical_necessity";
    const ctx = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT.medical_necessity;

    const knownParts = [
      c.patient_name                       && `Patient: ${c.patient_name}`,
      n.patientAddress                     && `Address: ${n.patientAddress}`,
      n.patientEmail                       && `Email: ${n.patientEmail}`,
      `Date: ${today}`,
      c.insurer                            && `Insurance Company: ${c.insurer}`,
      (c.policy_id || n.memberID)          && `Member ID: ${c.policy_id || n.memberID}`,
      n.claimNumber                        && `Claim Number: ${n.claimNumber}`,
      n.planName                           && `Plan: ${n.planName}`,
      (c.doctor_name || n.doctorName)      && `Treating Physician: ${c.doctor_name || n.doctorName}`,
      c.specialty                          && `Specialty: ${c.specialty}`,
      c.procedure                          && `Procedure: ${c.procedure}`,
      c.denial_type                        && `Denial Type: ${c.denial_type}`,
      c.denial_reason                      && `Denial Reason: ${c.denial_reason}`,
      n.denialDate                         && `Denial Date: ${n.denialDate}`,
      n.diagnosis                          && `Diagnosis: ${n.diagnosis}`,
      n.cptCodes                           && `CPT Codes: ${n.cptCodes}`,
      n.medicalHistory                     && `Medical History: ${n.medicalHistory}`,
      n.priorTreatments                    && `Prior Treatments: ${n.priorTreatments}`,
      n.symptoms                           && `Symptoms: ${n.symptoms}`,
      n.conditionDuration                  && `Duration of Condition: ${n.conditionDuration}`,
    ].filter(Boolean).join("\n");

    const hasDenialLetter = !!(n.hasDenialLetter);

    // Only use citations that are in the approved list
    const adminCitations = (a.legalCitations || []).filter((cited) =>
      APPROVED_CITATIONS.some((approved) =>
        approved.startsWith(cited.split("—")[0].trim()) ||
        cited.includes(approved.split("—")[0].trim())
      )
    );
    const safeCitations = adminCitations.length > 0 ? adminCitations : APPROVED_CITATIONS.slice(0, 4);

    const prompt = `Draft a formal insurance appeal letter. This is a ${ctx.appealType}.
${ZERO_HALLUCINATION_BLOCK}

APPEAL TYPE: ${ctx.appealType}
CORE ARGUMENT: ${ctx.coreArgument}

CONFIRMED INFORMATION (use ONLY these fields):
${knownParts}

KEY ARGUMENTS (use only these):
${(a.keyArgs || []).map((arg) => `- ${arg}`).join("\n") || "— argue solely on the stated denial reason"}

APPROVED LEGAL CITATIONS (use 2-4 of these — NO others):
${safeCitations.map((c) => `- ${c}`).join("\n")}

DATE TODAY: ${today}
DENIAL LETTER ON FILE: ${hasDenialLetter ? "YES" : "NO"}

LETTER STRUCTURE (follow exactly):
1. Date (today only)
2. Patient contact block — ONLY fields present above
3. Insurer address block — ONLY fields present; if address unknown, insurer name only
4. Re: line — ONLY known claim identifiers; omit unknowns
5. Opening: "I am writing to formally appeal the denial of..."
6. Core argument section — CORE ARGUMENT above; confirmed facts only; no studies or statistics
7. Legal rights — approved citations only
8. Demand reviewer credentials and peer-to-peer review
9. ACA federally mandated right to independent external review
10. Hard 30-day deadline for written response
11. Enclosures: if YES → "Enclosures: Original Denial Letter"; if NO → omit entirely
12. Patient signature block with name and blank date line
13. This exact disclaimer:

---
This appeal letter was prepared with the assistance of AppealTheDenial (appealthedenial.com). AppealTheDenial is not a law firm and this document does not constitute legal advice. Review carefully before signing and submitting.`;

    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 2500, stream: true,
      system: "You are an expert insurance appeals attorney. Write formal, legally precise, assertive appeal letters in first person. Use ONLY provided facts — never invent names, IDs, dates, addresses, or any details.",
      messages: [{ role: "user", content: prompt }],
    });

    const full = await readSSEChunks(resp, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`));
    db.prepare("UPDATE cases SET letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(full, caseId);
    trackTimeline(caseId, "Appeal letter regenerated via admin UI");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── External Review Letter ────────────────────────────────────────────────────
router.post("/ai/external-review", adminAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
    if (!row) return res.status(404).json({ error: "Not found" });
    const c = parseCase(row);
    const n = c.notes;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const knownParts = [
      c.patient_name                  && `Patient: ${c.patient_name}`,
      n.patientAddress                && `Address: ${n.patientAddress}`,
      n.patientEmail                  && `Email: ${n.patientEmail}`,
      c.insurer                       && `Insurance Company: ${c.insurer}`,
      (c.policy_id || n.memberID)     && `Member ID: ${c.policy_id || n.memberID}`,
      n.claimNumber                   && `Claim Number: ${n.claimNumber}`,
      c.procedure                     && `Procedure: ${c.procedure}`,
      c.denial_reason                 && `Denial Reason: ${c.denial_reason}`,
      c.denial_category               && `Denial Category: ${c.denial_category}`,
    ].filter(Boolean).join("\n");

    const prompt = `Draft a formal request for independent external review of an insurance denial.
${ZERO_HALLUCINATION_BLOCK}

CONFIRMED INFORMATION:
${knownParts}

DATE TODAY: ${today}

The internal appeal has been exhausted and upheld. The patient is now requesting independent external review.

LETTER REQUIREMENTS:
1. Address to: "Office of Consumer Assistance / [State] Department of Insurance" — use generic if state unknown
2. Clearly state this is a request for independent external review under the ACA
3. Identify the patient and the denied claim (ONLY confirmed identifiers)
4. State the denial reason and that the internal appeal was upheld
5. Cite 42 U.S.C. § 300gg-19 (ACA § 2719) as the basis for this right
6. Request written confirmation of the external review process and timeline
7. Note the 4-month deadline from the date of final internal denial to request external review
8. Be firm and factual — do not embellish or add facts not confirmed above
9. Signature block with blank date line

After signature, add:
---
This letter was prepared with the assistance of AppealTheDenial (appealthedenial.com). Not legal advice.`;

    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 1500, stream: true,
      system: "You are an expert insurance appeals attorney. Write formal external review request letters. Use ONLY confirmed facts.",
      messages: [{ role: "user", content: prompt }],
    });

    const full = await readSSEChunks(resp, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`));
    trackTimeline(caseId, "External review request letter generated");
    // Store as a separate field in notes
    const rNotes = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
    let notes = {};
    try { notes = rNotes?.notes ? JSON.parse(rNotes.notes) : {}; } catch {}
    notes.externalReviewLetter = full;
    db.prepare("UPDATE cases SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(notes), caseId);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Chat (streaming) ──────────────────────────────────────────────────────────
router.post("/ai/chat", adminAuth, async (req, res) => {
  try {
    const { messages, caseId } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }
    const safeMessages = messages.slice(-20).map((m) => ({
      role:    m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    let sys = "You are an expert insurance appeals attorney. Be concise and practical.";
    if (caseId) {
      const row = db.prepare(
        "SELECT denial_type, insurer, procedure, denial_reason, denial_category FROM cases WHERE id = ?"
      ).get(caseId);
      if (row) {
        sys = `You are an expert insurance appeals attorney advising on a "${row.denial_type || row.denial_category}" denial from ${row.insurer} for ${row.procedure}. Denial reason: "${row.denial_reason}". Be concise and practical.`;
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 800, stream: true,
      system: sys, messages: safeMessages,
    });
    await readSSEChunks(resp, (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`));
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
