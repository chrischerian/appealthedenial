const { db } = require("../db.cjs");
const { processCase } = require("./processor.cjs");

// In-memory file buffers — cleared after processing
const _fileBuffers = new Map();

function enqueueJob(caseId, email, file) {
  db.prepare("INSERT INTO job_queue (case_id, email) VALUES (?, ?)").run(caseId, email);
  if (file) _fileBuffers.set(caseId, file);
  setImmediate(drainQueue);
}

let _workerRunning = false;

async function drainQueue() {
  if (_workerRunning) return;
  _workerRunning = true;
  try {
    while (true) {
      const job = db.prepare(
        "SELECT * FROM job_queue WHERE status = 'pending' AND attempts < 3 ORDER BY created_at LIMIT 1"
      ).get();
      if (!job) break;

      db.prepare(
        "UPDATE job_queue SET status = 'running', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(job.id);

      try {
        const file = _fileBuffers.get(job.case_id) || null;
        await processCase(job.case_id, job.email, file);
        _fileBuffers.delete(job.case_id);
        db.prepare("UPDATE job_queue SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(job.id);
      } catch (err) {
        console.error(`[JOB ${job.id} CASE ${job.case_id}] Failed:`, err.message);
        _fileBuffers.delete(job.case_id);
        const nextStatus = (job.attempts + 1) >= 3 ? "failed" : "pending";
        db.prepare(
          "UPDATE job_queue SET status = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(nextStatus, err.message, job.id);
        db.prepare("UPDATE cases SET status = 'Error', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(job.case_id);
      }
    }
  } finally {
    _workerRunning = false;
  }
}

module.exports = { enqueueJob, drainQueue, _fileBuffers };
