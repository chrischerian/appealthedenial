// Customer form for adding missing info when case is in "Info Needed" status.
// Accessed via /update?token=xxx (link sent in the Info Needed email).
import { useState, useEffect } from "react";

const BASE = "http://localhost:3001/api";

// Which fields we may ask for, and how to label them
const FIELD_META = {
  patientName:    { label: "Your full name",        type: "input",    placeholder: "First and last name" },
  memberID:       { label: "Member / Policy ID",    type: "input",    placeholder: "From your insurance card" },
  claimNumber:    { label: "Claim number",          type: "input",    placeholder: "From your denial letter" },
  insurer:        { label: "Insurance company",     type: "input",    placeholder: "e.g. Aetna, UnitedHealthcare" },
  procedure:      { label: "What was denied?",      type: "input",    placeholder: "e.g. MRI of lumbar spine" },
  denialReason:   { label: "Denial reason",         type: "textarea", placeholder: "Copy the exact reason from your denial letter" },
  diagnosis:      { label: "Your diagnosis",        type: "input",    placeholder: "e.g. Lumbar disc herniation" },
  medicalHistory: { label: "Relevant medical history", type: "textarea", placeholder: "Relevant conditions, diagnoses, background" },
  priorTreatments:{ label: "Prior treatments tried", type: "textarea", placeholder: "e.g. Physical therapy x 6 weeks, NSAIDs — both failed" },
  symptoms:       { label: "Your symptoms",         type: "input",    placeholder: "e.g. Severe lower back pain, leg numbness" },
  conditionDuration:{ label: "How long have you had this?", type: "input", placeholder: "e.g. 6 months" },
};

export default function UpdateInfo({ navigate, token: tokenProp }) {
  const token   = tokenProp || new URLSearchParams(window.location.search).get("token");
  const [meta,   setMeta]   = useState(null);  // { caseId, insurer, procedure, missingFields }
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,  setError]  = useState("");
  const [done,   setDone]   = useState(false);

  useEffect(() => {
    if (!token) { setError("No token found in URL."); setLoading(false); return; }
    fetch(`${BASE}/update-info?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setMeta(data);
        // Pre-initialize fields
        const init = {};
        (data.missingFields || []).forEach((f) => {
          // Try to match field names to FIELD_META keys
          const key = Object.keys(FIELD_META).find((k) =>
            k.toLowerCase().includes(f.toLowerCase().replace(/\s/g, "")) ||
            f.toLowerCase().includes(k.toLowerCase())
          );
          if (key) init[key] = "";
        });
        setFields(init);
      })
      .catch(() => setError("Could not load case information. The link may have expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const up = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    const filled = Object.values(fields).some((v) => v.trim());
    if (!filled) { setError("Please fill in at least one field."); return; }
    setSubmitting(true);
    setError("");
    try {
      const resp = await fetch(`${BASE}/update-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fields }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Submission failed."); return; }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared wrapper ──────────────────────────────────────────────────────────
  const Wrap = ({ children }) => (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 28, textAlign: "center" }}>
            AppealTheDenial
        </div>
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Wrap>
        <div style={{ textAlign: "center", color: "#6B7280", fontSize: 14 }}>Loading your case…</div>
      </Wrap>
    );
  }

  if (error && !meta) {
    return (
      <Wrap>
        <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 10, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, color: "#EF4444", fontWeight: 500, marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>
            Try clicking the link in your email again, or reply to that email with the missing information.
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#4B5563", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to home
          </button>
        </div>
      </Wrap>
    );
  }

  if (done) {
    return (
      <Wrap>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#10B98118", border: "1px solid #10B98130", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 24 }}>
            ✓
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: "#EFF6FF", marginBottom: 12 }}>We've got it.</h2>
          <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.7, marginBottom: 32 }}>
            Your information has been received. We're reprocessing your case now and will email you when your appeal letter is ready.
          </p>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to home
          </button>
        </div>
      </Wrap>
    );
  }

  const fieldKeys = Object.keys(fields);

  return (
    <Wrap>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#EFF6FF", marginBottom: 8 }}>We need a few more details</h2>
        <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65 }}>
          To write a complete appeal for your <strong style={{ color: "#9CA3AF" }}>{meta?.procedure}</strong> denial from <strong style={{ color: "#9CA3AF" }}>{meta?.insurer}</strong>, we need the following:
        </p>
      </div>

      {error && (
        <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: "#0f1827", border: "1px solid #1a2640", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        {fieldKeys.length === 0 ? (
          // Fallback: show all fields if we can't match
          Object.entries(FIELD_META).slice(0, 4).map(([key, meta]) => (
            <FieldInput key={key} fieldKey={key} meta={meta} value={fields[key] || ""} onChange={(v) => up(key, v)} />
          ))
        ) : (
          fieldKeys.map((key) => {
            const m = FIELD_META[key];
            if (!m) return null;
            return <FieldInput key={key} fieldKey={key} meta={m} value={fields[key] || ""} onChange={(v) => up(key, v)} />;
          })
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%", background: submitting ? "#1a2640" : "#3B82F6",
          color: submitting ? "#4B5563" : "#fff",
          border: "none", borderRadius: 9, padding: "14px 0",
          fontSize: 15, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
          fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        {submitting && <span style={{ width: 14, height: 14, border: "2px solid #4B5563", borderTopColor: "#9CA3AF", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
        {submitting ? "Submitting…" : "Submit & complete my appeal →"}
      </button>

      <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#374151" }}>
        Or simply reply to the email you received with this information.
      </p>
    </Wrap>
  );
}

function FieldInput({ fieldKey, meta, value, onChange }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, color: "#9CA3AF", marginBottom: 6, fontWeight: 500 }}>
        {meta.label}
      </label>
      {meta.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.placeholder}
          style={{ minHeight: 80 }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.placeholder}
        />
      )}
    </div>
  );
}
