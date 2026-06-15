const cors   = require("cors");
const multer = require("multer");

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

const corsMiddleware = cors({ origin: ALLOWED_ORIGINS });

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────
const _buckets = new Map();
function checkRate(ip, max = 5, windowMs = 60 * 60 * 1000) {
  // Never rate-limit localhost
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;
  const now  = Date.now();
  const hits = (_buckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  _buckets.set(ip, hits);
  return true;
}

// ── Admin auth ────────────────────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "atd_admin_2024";
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── File upload (memory, 10 MB, images + PDFs only) ──────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)|application\/pdf$/.test(file.mimetype);
    cb(ok ? null : new Error("Only images and PDFs are accepted."), ok);
  },
});

module.exports = { corsMiddleware, checkRate, adminAuth, upload, ADMIN_TOKEN };
