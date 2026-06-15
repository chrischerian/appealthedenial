const { Router } = require("express");
const { db, parseCase } = require("../db.cjs");
const { adminAuth }     = require("../middleware.cjs");

const router = Router();

// List — lightweight payload (no letter/analysis)
router.get("/cases", adminAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, denial_type, insurer, procedure, denial_reason, amount,
             policy_id, patient_name, patient_email, doctor_name, specialty,
             status, denial_category, authorized_send, hipaa_authorized,
             appeal_deadline, delivery_method, delivery_tracking,
             created_at, updated_at, notes
      FROM cases ORDER BY created_at DESC
    `).all().map(parseCase);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single case — full payload
router.get("/cases/:id", adminAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(parseCase(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create (admin manual intake)
router.post("/cases", adminAuth, (req, res) => {
  try {
    const {
      denial_type, insurer, procedure, denial_reason, amount, policy_id,
      patient_name, doctor_name, specialty, notes,
    } = req.body;
    const result = db.prepare(`
      INSERT INTO cases
        (denial_type, insurer, procedure, denial_reason, amount, policy_id,
         patient_name, doctor_name, specialty, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      denial_type, insurer, procedure, denial_reason,
      amount != null ? Number(amount) : null,
      policy_id, patient_name, doctor_name, specialty,
      notes ? JSON.stringify(notes) : null,
    );
    res.json(parseCase(db.prepare("SELECT * FROM cases WHERE id = ?").get(result.lastInsertRowid)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.patch("/cases/:id", adminAuth, (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });

    const allowed = ["status", "analysis", "letter", "notes", "appeal_deadline", "denial_category"];
    const sets = [], vals = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = ?`);
        const v = req.body[key];
        vals.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v);
      }
    }
    if (sets.length) {
      db.prepare(`UPDATE cases SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(...vals, req.params.id);
    }
    res.json(parseCase(db.prepare("SELECT * FROM cases WHERE id = ?").get(req.params.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete("/cases/:id", adminAuth, (req, res) => {
  try {
    const changes = db.prepare("DELETE FROM cases WHERE id = ?").run(req.params.id).changes;
    if (!changes) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deadline alert — cases with deadline within N days that aren't resolved
router.get("/cases/meta/deadlines", adminAuth, (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const rows = db.prepare(`
      SELECT id, patient_name, patient_email, insurer, procedure, status, appeal_deadline
      FROM   cases
      WHERE  appeal_deadline IS NOT NULL
        AND  status NOT IN ('Letter Sent','Reversed','Upheld','Escalated','Provider Action Needed')
        AND  date(appeal_deadline) <= date('now', '+${days} days')
        AND  date(appeal_deadline) >= date('now')
      ORDER  BY appeal_deadline ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
