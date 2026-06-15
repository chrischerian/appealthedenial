require("dotenv").config({ override: true });

const express = require("express");

// ── Bootstrap modules (db must load first for migrations + recovery) ──────────
const { corsMiddleware } = require("./server/middleware.cjs");
const { stuckJobs }      = require("./server/db.cjs");
const { drainQueue }     = require("./server/services/queue.cjs");

// Re-drain any jobs that survived a crash/restart
if (stuckJobs.changes > 0) {
  console.log(`[STARTUP] Re-queuing ${stuckJobs.changes} interrupted job(s)`);
  setImmediate(drainQueue);
}

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", require("./server/routes/auth.cjs"));
app.use("/api", require("./server/routes/submit.cjs"));
app.use("/api", require("./server/routes/cases.cjs"));
app.use("/api", require("./server/routes/ai.cjs"));
app.use("/api", require("./server/routes/status.cjs"));
app.use("/api", require("./server/routes/fax.cjs"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[UNHANDLED ERROR]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Listen ────────────────────────────────────────────────────────────────────
const server = app.listen(3001, () =>
  console.log("✅ AppealTheDenial server → http://localhost:3001")
);
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("❌ Port 3001 already in use. Kill the old process and retry.");
    process.exit(1);
  } else {
    throw err;
  }
});
