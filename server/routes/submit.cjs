const { Router } = require("express");
const { db }              = require("../db.cjs");
const { checkRate, upload } = require("../middleware.cjs");
const { enqueueJob }      = require("../services/queue.cjs");

const router = Router();

router.post("/submit", upload.single("denialLetter"), async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  if (!checkRate(ip, 5)) {
    return res.status(429).json({ error: "Too many submissions. Please wait an hour and try again." });
  }

  const {
    name, insurer, procedure, denialReason, memberID, claimNumber, email,
    authorizedSend, hipaaAuthorized,
    // clinical context
    symptoms, conditionDuration, medicalHistory, priorTreatments, urgency,
  } = req.body;

  if (!insurer || !procedure || !denialReason || !email) {
    return res.status(400).json({ error: "Insurance company, procedure, denial reason, and email are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  try {
    const notes = {
      patientEmail:      email,
      patientName:       name       || undefined,
      memberID:          memberID   || undefined,
      claimNumber:       claimNumber || undefined,
      hasDenialLetter:   !!req.file,
      denialLetterMime:  req.file?.mimetype || undefined,
      // clinical
      symptoms:          symptoms         || undefined,
      conditionDuration: conditionDuration || undefined,
      medicalHistory:    medicalHistory   || undefined,
      priorTreatments:   priorTreatments  || undefined,
      urgency:           urgency          || undefined,
    };

    const authSend  = authorizedSend   === "true" || authorizedSend   === true;
    const authHipaa = hipaaAuthorized  === "true" || hipaaAuthorized  === true;

    const result = db.prepare(`
      INSERT INTO cases
        (insurer, procedure, denial_reason, patient_name, patient_email,
         policy_id, status, authorized_send, hipaa_authorized, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'Processing', ?, ?, ?)
    `).run(
      insurer, procedure, denialReason, name || null, email,
      memberID || null,
      authSend  ? 1 : 0,
      authHipaa ? 1 : 0,
      JSON.stringify(notes),
    );

    const caseId = result.lastInsertRowid;
    res.json({ id: caseId, status: "Processing" });
    enqueueJob(caseId, email, req.file || null);
  } catch (err) {
    console.error("[SUBMIT]", err.message);
    res.status(500).json({ error: "Failed to create case. Please try again." });
  }
});

module.exports = router;
