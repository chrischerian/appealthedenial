const { Router }     = require("express");
const { db, trackTimeline } = require("../db.cjs");
const { _faxTokens } = require("../services/delivery.cjs");

const router = Router();

// Twilio fetches the letter from this URL
router.get("/fax-content/:token", (req, res) => {
  const entry = _faxTokens.get(req.params.token);
  if (!entry || Date.now() > entry.expires) {
    return res.status(404).send("Expired or not found");
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(entry.letter);
});

// Twilio delivery status webhook
router.post("/fax-status/:caseId", require("express").urlencoded({ extended: false }), (req, res) => {
  const caseId = Number(req.params.caseId);
  const { FaxStatus, SentPages, ErrorCode, ErrorMessage } = req.body;
  const msg = [
    `Fax status: ${FaxStatus}`,
    SentPages    ? `pages sent: ${SentPages}`  : null,
    ErrorCode    ? `error ${ErrorCode}`        : null,
    ErrorMessage ? `(${ErrorMessage})`         : null,
  ].filter(Boolean).join(" — ");

  trackTimeline(caseId, msg);

  if (FaxStatus === "delivered") {
    db.prepare("UPDATE cases SET status = 'Letter Sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);
  }
  res.status(200).send("OK");
});

module.exports = router;
