import { useState, useEffect } from "react";
import { getStatus } from "../api.js";

const STATUS_MAP = {
  Processing: { label: "In Progress",       color: "#8B5CF6", step: 1, msg: "We're analyzing your denial and building your appeal strategy." },
  Analyzing:  { label: "In Progress",       color: "#8B5CF6", step: 1, msg: "Analyzing your denial and calculating your chances." },
  "Appeal Drafted": { label: "In Progress", color: "#F59E0B", step: 2, msg: "Your appeal letter is being finalized." },
  "Letter Sent":    { label: "Letter Sent", color: "#10B981", step: 3, msg: "Your appeal letter has been emailed to you. Check your inbox." },
  "Following Up":   { label: "Following Up",color: "#F97316", step: 3, msg: "Your letter was sent. We're monitoring for a response." },
  Reversed:  { label: "Won",    color: "#10B981", step: 4, msg: "Your denial was reversed. The appeal worked." },
  Upheld:    { label: "Upheld", color: "#EF4444", step: 3, msg: "The internal appeal was upheld. Consider requesting an external review." },
  Escalated: { label: "Escalated", color: "#EF4444", step: 3, msg: "This case has been escalated for further review." },
  Error:     { label: "Error", color: "#EF4444", step: 0, msg: "Something went wrong. Please contact support." },
};

const STEPS = ["Received", "Analyzing", "Letter Sent", "Done"];

function StatusDot({ active, done, color }) {
  return (
    <div
      style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        background: done ? "#10B981" : active ? color : "#1a2640",
        border: `2px solid ${done ? "#10B981" : active ? color : "#1a2640"}`,
        transition: "background 0.4s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {done && <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>&#x2713;</span>}
    </div>
  );
}

export default function Status({ email: initialEmail, navigate }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [inputEmail, setInputEmail] = useState(initialEmail || "");
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(!!initialEmail);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialEmail) { fetchStatus(initialEmail); }
  }, [initialEmail]);

  const fetchStatus = async (addr) => {
    setLoading(true); setError("");
    try {
      const data = await getStatus(addr);
      setCases(data);
      setEmail(addr);
    } catch (err) {
      setError(err.message || "Could not fetch status.");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = () => {
    if (!inputEmail.trim()) return;
    navigate(`/status?email=${encodeURIComponent(inputEmail.trim())}`);
    fetchStatus(inputEmail.trim());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 24px 40px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 40, textAlign: "center" }}>
          CoverFight
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8, color: "#EFF6FF" }}>
          Case Status
        </h2>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 32 }}>
          Enter the email you used when submitting your denial.
        </p>

        {/* Email lookup */}
        <div style={{ display: "flex", gap: 10, marginBottom: 40 }}>
          <input
            type="email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="you@email.com"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleLookup}
            disabled={loading || !inputEmail.trim()}
            style={{
              background: "#3B82F6", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontSize: 14,
              fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              opacity: loading || !inputEmail.trim() ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "…" : "Check"}
          </button>
        </div>

        {error && (
          <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && email && cases.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 20px", color: "#4B5563", fontSize: 14 }}>
            No cases found for <strong style={{ color: "#9CA3AF" }}>{email}</strong>.
            <br />Make sure you used the same email address.
          </div>
        )}

        {cases.map((c) => {
          const info = STATUS_MAP[c.status] || { label: c.status, color: "#6B7280", step: 0, msg: "" };
          const step = info.step;
          return (
            <div
              key={c.id}
              style={{
                background: "#0f1827",
                border: "1px solid #1a2640",
                borderRadius: 14,
                padding: 24,
                marginBottom: 16,
              }}
            >
              {/* Case header */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#EFF6FF", marginBottom: 4 }}>
                  {c.procedure || "Denied claim"}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  {c.insurer}{c.created_at ? ` · Submitted ${fmtDate(c.created_at)}` : ""}
                </div>
              </div>

              {/* Progress steps */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 20 }}>
                {STEPS.map((label, i) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      {i > 0 && (
                        <div style={{ flex: 1, height: 2, background: i <= step ? info.color : "#1a2640", transition: "background 0.4s" }} />
                      )}
                      <StatusDot active={i === step} done={i < step} color={info.color} />
                      {i < STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < step ? info.color : "#1a2640", transition: "background 0.4s" }} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: i <= step ? "#9CA3AF" : "#374151", marginTop: 8, textAlign: "center" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status message */}
              <div
                style={{
                  background: `${info.color}12`,
                  border: `1px solid ${info.color}28`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: info.color,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ fontWeight: 600 }}>{info.label}.</span>{" "}
                {info.msg}
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: "none", color: "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            &larr; Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(str) {
  try {
    return new Date(str.includes("T") ? str : str + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}
