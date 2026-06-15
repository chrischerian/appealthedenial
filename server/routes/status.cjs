const { Router }              = require("express");
const { db, parseCase, trackTimeline } = require("../db.cjs");
const { enqueueJob }          = require("../services/queue.cjs");

const router = Router();

// ── Customer: status lookup by email ─────────────────────────────────────────
router.get("/status", (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email query param required" });
  try {
    const rows = db.prepare(
      "SELECT id, status, procedure, insurer, created_at, appeal_deadline, denial_category FROM cases WHERE patient_email = ? ORDER BY created_at DESC"
    ).all(email);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Customer: get update form by token ────────────────────────────────────────
// Used when customer clicks "provide more info" link from the Info Needed email
router.get("/update-info", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });
  try {
    const rows = db.prepare("SELECT id, insurer, procedure, status, notes FROM cases").all();
    const match = rows.find((r) => {
      try { return JSON.parse(r.notes || "{}").updateToken === token; } catch { return false; }
    });
    if (!match) return res.status(404).json({ error: "Token not found or expired." });
    if (match.status !== "Info Needed") return res.status(409).json({ error: "This case is no longer waiting on information." });

    const notes = JSON.parse(match.notes || "{}");
    res.json({
      caseId:        match.id,
      insurer:       match.insurer,
      procedure:     match.procedure,
      missingFields: notes.missingFields || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Customer: submit additional info ─────────────────────────────────────────
router.post("/update-info", (req, res) => {
  const { token, fields } = req.body;
  if (!token || !fields || typeof fields !== "object") {
    return res.status(400).json({ error: "token and fields object required" });
  }
  try {
    const rows  = db.prepare("SELECT id, patient_email, status, notes FROM cases").all();
    const match = rows.find((r) => {
      try { return JSON.parse(r.notes || "{}").updateToken === token; } catch { return false; }
    });
    if (!match) return res.status(404).json({ error: "Token not found or expired." });
    if (match.status !== "Info Needed") {
      return res.status(409).json({ error: "This case is no longer waiting on information." });
    }

    // Merge supplied fields into notes
    const notes = JSON.parse(match.notes || "{}");
    const allowed = [
      "patientName","memberID","claimNumber","insurer","procedure","denialReason",
      "diagnosis","medicalHistory","priorTreatments","symptoms","conditionDuration",
    ];
    for (const key of allowed) {
      if (fields[key] && String(fields[key]).trim()) {
        notes[key] = String(fields[key]).trim();
      }
    }
    // Invalidate the token so it can't be reused
    delete notes.updateToken;
    delete notes.missingFields;

    db.prepare("UPDATE cases SET notes = ?, status = 'Processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(notes), match.id);
    trackTimeline(match.id, "Customer provided additional information — reprocessing");

    // Re-queue the case
    enqueueJob(match.id, match.patient_email, null);
    res.json({ success: true, message: "Thank you — your case is being reprocessed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
