import { useState, useRef, useEffect } from "react";
import { submitCase } from "../api.js";

const INSURERS = [
  "Aetna", "Anthem / BCBS", "Cigna", "Humana", "Kaiser Permanente",
  "Medicaid", "Medicare", "Molina Healthcare", "UnitedHealthcare", "Other",
];

const URGENCY_OPTIONS = [
  { value: "routine",   label: "Routine — no immediate threat" },
  { value: "urgent",    label: "Urgent — treatment needed soon" },
  { value: "emergency", label: "Emergency — urgent medical need" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function Label({ children, required, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ display: "block", fontSize: 13, color: "#64748B", fontWeight: 500 }}>
        {children}{required && <span style={{ color: "#EF4444" }}> *</span>}
      </label>
      {hint && <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function FieldWrap({ children, style }) {
  return <div style={{ marginBottom: 20, ...style }}>{children}</div>;
}

function Checkbox({ checked, onChange, children, description }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        background: checked ? "#05966908" : "transparent",
        border: `1px solid ${checked ? "#05966940" : "#E2E8F0"}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 16,
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
          background: checked ? "#059669" : "transparent",
          border: `2px solid ${checked ? "#059669" : "#CBD5E1"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 13, color: "#475569", fontWeight: 500, marginBottom: 3 }}>{children}</div>
        {description && <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.55 }}>{description}</div>}
      </div>
    </div>
  );
}

function FileUpload({ file, onChange }) {
  const inputRef  = useRef(null);
  const [drag, setDrag] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const isImage = file && file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const accept = (f) => {
    if (!f) return;
    const ok = f.type.startsWith("image/") || f.type === "application/pdf" || f.name.endsWith(".pdf");
    if (ok) onChange(f);
  };

  return file ? (
    <div style={{ border: "1px solid #D7DEE7", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF" }}>
      {isImage ? (
        <img src={previewUrl} alt="preview" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#475569", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB</div>
      </div>
      <button onClick={() => onChange(null)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 18, padding: "0 4px", flexShrink: 0 }} title="Remove">×</button>
    </div>
  ) : (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); }}
      style={{
        border: `1.5px dashed ${drag ? "#059669" : "#D7DEE7"}`,
        borderRadius: 10, padding: "24px 16px",
        textAlign: "center", cursor: "pointer",
        background: drag ? "#05966908" : "transparent",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 2 }}>
        Drop your denial letter here, or <span style={{ color: "#059669" }}>browse</span>
      </div>
      <div style={{ fontSize: 11, color: "#CBD5E1" }}>JPG, PNG, PDF · max 10 MB</div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => accept(e.target.files[0])} />
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function Section({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20, paddingTop: 8, borderTop: "1px solid #E2E8F0", marginTop: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#94A3B8" }}>{subtitle}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Submit({ navigate }) {
  const [form, setForm] = useState({
    name: "", email: "",
    insurer: "", procedure: "", denialReason: "",
    memberID: "", claimNumber: "",
    // clinical context
    symptoms: "", conditionDuration: "", medicalHistory: "", priorTreatments: "",
    urgency: "routine",
  });
  const [denialFile, setDenialFile] = useState(null);
  const [authorizedSend, setAuthorizedSend] = useState(false);
  const [hipaaAuthorized, setHipaaAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.insurer && form.procedure.trim() && form.denialReason.trim() && form.email.trim();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitCase({ ...form, denialFile, authorizedSend, hipaaAuthorized });
      navigate(`/success?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 24px 80px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", color: "#94A3B8", border: "none", cursor: "pointer", fontSize: 14, marginBottom: 36, padding: 0 }}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#059669", marginBottom: 10 }}>
            AppealTheDenial
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8, color: "#0F172A" }}>
            Tell us about your denial
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>We'll handle everything from here.</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 28 }}>

          {/* ── Your info ─────────────────────────────────────────────────── */}
          <FieldWrap>
            <Label>Your name</Label>
            <input value={form.name} onChange={(e) => up("name", e.target.value)} placeholder="First and last name" />
          </FieldWrap>

          <FieldWrap>
            <Label required hint="We'll email your letter here when it's ready">Your email</Label>
            <input type="email" value={form.email} onChange={(e) => up("email", e.target.value)} placeholder="you@email.com" />
          </FieldWrap>

          {/* ── Denial info ───────────────────────────────────────────────── */}
          <Section title="Denial details" subtitle="Copy from your denial letter" />

          <FieldWrap>
            <Label required>Insurance company</Label>
            <input
              list="insurer-list"
              value={form.insurer}
              onChange={(e) => up("insurer", e.target.value)}
              placeholder="Select or type your insurer…"
            />
            <datalist id="insurer-list">
              {INSURERS.map((i) => <option key={i} value={i} />)}
            </datalist>
          </FieldWrap>

          <FieldWrap>
            <Label required>What was denied?</Label>
            <input value={form.procedure} onChange={(e) => up("procedure", e.target.value)} placeholder="e.g. MRI of lumbar spine, Humira 40mg, surgery" />
          </FieldWrap>

          <FieldWrap>
            <Label required hint="Copy the exact wording from your denial letter if possible">Why did they deny it?</Label>
            <textarea value={form.denialReason} onChange={(e) => up("denialReason", e.target.value)} placeholder="e.g. Not medically necessary per clinical guidelines" style={{ minHeight: 90 }} />
          </FieldWrap>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <Label hint="From your insurance card">Member / Policy ID</Label>
              <input value={form.memberID} onChange={(e) => up("memberID", e.target.value)} placeholder="e.g. XYZ123456789" />
            </div>
            <div>
              <Label hint="From denial letter">Claim number</Label>
              <input value={form.claimNumber} onChange={(e) => up("claimNumber", e.target.value)} placeholder="e.g. CLM-2024-88821" />
            </div>
          </div>

          <FieldWrap>
            <Label hint="Claude reads it and extracts all identifiers automatically">
              Upload denial letter <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional but recommended)</span>
            </Label>
            <FileUpload file={denialFile} onChange={setDenialFile} />
          </FieldWrap>

          {/* ── Clinical context ──────────────────────────────────────────── */}
          <Section title="Clinical context" subtitle="Strengthens your appeal — the more detail, the better the letter" />

          <FieldWrap>
            <Label hint="e.g. severe lower back pain, numbness in left leg">Your symptoms</Label>
            <input value={form.symptoms} onChange={(e) => up("symptoms", e.target.value)} placeholder="Describe your symptoms" />
          </FieldWrap>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <Label>How long have you had this condition?</Label>
              <input value={form.conditionDuration} onChange={(e) => up("conditionDuration", e.target.value)} placeholder="e.g. 6 months" />
            </div>
            <div>
              <Label>Urgency</Label>
              <select value={form.urgency} onChange={(e) => up("urgency", e.target.value)}>
                {URGENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <FieldWrap>
            <Label hint="e.g. physical therapy for 6 weeks, NSAIDs for 3 months — both failed">Prior treatments tried that didn't work</Label>
            <textarea value={form.priorTreatments} onChange={(e) => up("priorTreatments", e.target.value)} placeholder="List any treatments you've already tried and why they weren't enough" style={{ minHeight: 80 }} />
          </FieldWrap>

          <FieldWrap>
            <Label hint="e.g. diagnosed with lumbar disc herniation, chronic pain since 2023">Relevant medical history</Label>
            <textarea value={form.medicalHistory} onChange={(e) => up("medicalHistory", e.target.value)} placeholder="Any relevant diagnoses, conditions, or history the insurer should know" style={{ minHeight: 80 }} />
          </FieldWrap>

          {/* ── Authorizations ────────────────────────────────────────────── */}
          <Section title="Authorizations" subtitle="Optional — enables us to act on your behalf" />

          <Checkbox
            checked={authorizedSend}
            onChange={setAuthorizedSend}
            description="I authorize AppealTheDenial to submit this appeal to my insurance company on my behalf via fax or certified mail. AppealTheDenial is not a law firm and this is not legal advice."
          >
            Let AppealTheDenial file the appeal for me
          </Checkbox>

          <Checkbox
            checked={hipaaAuthorized}
            onChange={setHipaaAuthorized}
            description="I authorize AppealTheDenial to request medical records from my healthcare provider(s) to support this appeal, if needed."
          >
            Authorize medical records access (HIPAA)
          </Checkbox>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            style={{
              width: "100%", marginTop: 8,
              background: valid && !loading ? "#059669" : "#E2E8F0",
              color: valid && !loading ? "#fff" : "#94A3B8",
              border: "none", borderRadius: 9, padding: "14px 0",
              fontSize: 15, fontWeight: 600,
              cursor: valid && !loading ? "pointer" : "not-allowed",
              transition: "background 0.15s", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {loading && (
              <span style={{ width: 14, height: 14, border: "2px solid #94A3B8", borderTopColor: "#64748B", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            )}
            {loading ? "Submitting…" : "Submit →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#CBD5E1" }}>
          Free &nbsp;·&nbsp; No account &nbsp;·&nbsp; Not legal advice
        </div>
      </div>
    </div>
  );
}
