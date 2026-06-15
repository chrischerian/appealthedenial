// ── Database singleton ────────────────────────────────────────────────────────
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "coverfight.db"));
db.pragma("journal_mode = WAL");  // better concurrency
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    -- denial info
    denial_type       TEXT,
    insurer           TEXT,
    procedure         TEXT,
    denial_reason     TEXT,
    amount            REAL,
    policy_id         TEXT,
    -- patient
    patient_name      TEXT,
    patient_email     TEXT,
    -- provider
    doctor_name       TEXT,
    specialty         TEXT,
    -- AI processing
    status            TEXT    DEFAULT 'New',
    denial_category   TEXT,
    analysis          TEXT,
    letter            TEXT,
    -- delivery tracking
    delivery_method   TEXT,
    delivery_tracking TEXT,
    -- authorizations (stored as 0/1)
    authorized_send   INTEGER DEFAULT 0,
    hipaa_authorized  INTEGER DEFAULT 0,
    -- appeal deadline (ISO date string, extracted from denial letter)
    appeal_deadline   TEXT,
    -- blob for everything else (extracted doc data, timeline, clinical history)
    notes             TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS job_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id    INTEGER NOT NULL,
    email      TEXT    NOT NULL,
    status     TEXT    DEFAULT 'pending',
    attempts   INTEGER DEFAULT 0,
    last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Migrations (idempotent) ───────────────────────────────────────────────────
const MIGRATIONS = [
  "ALTER TABLE cases ADD COLUMN patient_email TEXT",
  "ALTER TABLE cases ADD COLUMN denial_category TEXT",
  "ALTER TABLE cases ADD COLUMN delivery_method TEXT",
  "ALTER TABLE cases ADD COLUMN delivery_tracking TEXT",
  "ALTER TABLE cases ADD COLUMN authorized_send INTEGER DEFAULT 0",
  "ALTER TABLE cases ADD COLUMN hipaa_authorized INTEGER DEFAULT 0",
  "ALTER TABLE cases ADD COLUMN appeal_deadline TEXT",
  "CREATE INDEX IF NOT EXISTS idx_patient_email ON cases(patient_email)",
  "CREATE INDEX IF NOT EXISTS idx_status        ON cases(status)",
  "CREATE INDEX IF NOT EXISTS idx_appeal_deadline ON cases(appeal_deadline)",
];
for (const sql of MIGRATIONS) { try { db.exec(sql); } catch {} }

// ── Backfill patient_email from notes.patientEmail ────────────────────────────
db.prepare("SELECT id, notes FROM cases WHERE patient_email IS NULL AND notes IS NOT NULL")
  .all()
  .forEach((row) => {
    try {
      const n = JSON.parse(row.notes);
      if (n.patientEmail) {
        db.prepare("UPDATE cases SET patient_email = ? WHERE id = ?").run(n.patientEmail, row.id);
      }
    } catch {}
  });

// ── Recover crashed cases ─────────────────────────────────────────────────────
const recovered = db.prepare(
  `UPDATE cases SET status = 'Error'
   WHERE status IN ('Processing','Analyzing')
   AND datetime(updated_at) < datetime('now','-30 minutes')`
).run();
if (recovered.changes > 0) {
  console.log(`[DB] Recovered ${recovered.changes} stuck case(s) → Error`);
}

// ── Re-queue interrupted jobs ─────────────────────────────────────────────────
const stuckJobs = db.prepare(
  "UPDATE job_queue SET status = 'pending' WHERE status = 'running'"
).run();

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCase(c) {
  let analysis = null, notes = {};
  try { analysis = c.analysis ? JSON.parse(c.analysis) : null; } catch {}
  try { notes    = c.notes    ? JSON.parse(c.notes)    : {};   } catch {}
  return { ...c, analysis, notes };
}

function trackTimeline(caseId, event) {
  try {
    const row = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
    let notes = {};
    try { notes = row?.notes ? JSON.parse(row.notes) : {}; } catch {}
    const timeline = notes.timeline || [];
    timeline.push({ event, ts: new Date().toISOString() });
    notes.timeline = timeline;
    db.prepare("UPDATE cases SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(notes), caseId);
  } catch (err) {
    console.error(`[CASE ${caseId}] trackTimeline error:`, err.message);
  }
}

module.exports = { db, parseCase, trackTimeline, stuckJobs };
