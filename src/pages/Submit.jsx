import { useState, useRef } from "react";
import { submitCase } from "../api.js";

const INSURERS = [
  "UnitedHealth", "Anthem / BCBS", "Cigna", "Aetna", "Humana",
  "Molina Healthcare", "Centene", "Kaiser Permanente", "Medicare", "Medicaid", "Other",
];

function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 13, color: "#9CA3AF", marginBottom: 7, fontWeight: 500 }}>
      {children}{required && <span style={{ color: "#EF4444" }}> *</span>}
    </label>
  );
}

function FieldWrap({ children }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>;
}

function FileUpload({ file, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const accept = (f) => {
    if (!f) return;
    const ok = f.type.startsWith("image/") || f.type === "application/pdf" || f.name.endsWith(".pdf");
    if (!ok) return;
    onChange(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    accept(e.dataTransfer.files[0]);
  };

  const isImage = file && file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div>
      {file ? (
        <div
          style={{
            border: "1px solid #1e3a5f",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#0a1520",
          }}
        >
          {isImage ? (
            <img
              src={previewUrl}
              alt="preview"
              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 48, height: 48, borderRadius: 6, flexShrink: 0,
                background: "#1a2640", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20,
              }}
            >
              📄
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>
              {(file.size / 1024).toFixed(0)} KB
            </div>
          </div>
          <button
            onClick={() => onChange(null)}
            style={{
              background: "none", border: "none", color: "#4B5563",
              cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px",
              flexShrink: 0,
            }}
            title="Remove file"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{
            border: `1.5px dashed ${drag ? "#3B82F6" : "#1e3055"}`,
            borderRadius: 10,
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: drag ? "#3B82F608" : "transparent",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 2 }}>
            Drop your denial letter here, or <span style={{ color: "#3B82F6" }}>browse</span>
          </div>
          <div style={{ fontSize: 11, color: "#374151" }}>JPG, PNG, PDF · max 10 MB</div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={(e) => accept(e.target.files[0])}
          />
        </div>
      )}
    </div>
  );
}

export default function Submit({ navigate }) {
  const [form, setForm] = useState({ name: "", insurer: "", procedure: "", denialReason: "", email: "" });
  const [denialFile, setDenialFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.insurer && form.procedure.trim() && form.denialReason.trim() && form.email.trim();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitCase({ ...form, denialFile });
      navigate(`/success?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", color: "#4B5563", border: "none", cursor: "pointer", fontSize: 14, marginBottom: 36, padding: 0 }}
        >
          &larr; Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 12 }}>
            CoverFight
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8, color: "#EFF6FF" }}>
            Tell us about your denial
          </h2>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            We'll handle everything from here.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#EF444412", border: "1px solid #EF444430", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#EF4444", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ background: "#0f1827", border: "1px solid #1a2640", borderRadius: 14, padding: 28 }}>

          <FieldWrap>
            <Label>Your name</Label>
            <input
              value={form.name}
              onChange={(e) => up("name", e.target.value)}
              placeholder="First and last name"
            />
          </FieldWrap>

          <FieldWrap>
            <Label required>Insurance Company</Label>
            <select value={form.insurer} onChange={(e) => up("insurer", e.target.value)}>
              <option value="">Select your insurer…</option>
              {INSURERS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </FieldWrap>

          <FieldWrap>
            <Label required>What was denied?</Label>
            <input
              value={form.procedure}
              onChange={(e) => up("procedure", e.target.value)}
              placeholder="e.g. MRI of lumbar spine, Humira 40mg, surgery"
            />
          </FieldWrap>

          <FieldWrap>
            <Label required>Why did they deny it?</Label>
            <textarea
              value={form.denialReason}
              onChange={(e) => up("denialReason", e.target.value)}
              placeholder="Copy the reason from your denial letter, or describe it in your own words"
              style={{ minHeight: 100 }}
            />
          </FieldWrap>

          <FieldWrap>
            <Label>Upload denial letter <span style={{ color: "#4B5563", fontWeight: 400 }}>(optional)</span></Label>
            <FileUpload file={denialFile} onChange={setDenialFile} />
            <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>
              Claude will read it and extract details automatically
            </div>
          </FieldWrap>

          <FieldWrap>
            <Label required>Your email</Label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => up("email", e.target.value)}
              placeholder="you@email.com"
            />
            <div style={{ fontSize: 12, color: "#4B5563", marginTop: 5 }}>
              We'll email your appeal letter here when it's ready
            </div>
          </FieldWrap>

          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            style={{
              width: "100%",
              background: valid && !loading ? "#3B82F6" : "#1a2640",
              color: valid && !loading ? "#fff" : "#4B5563",
              border: "none",
              borderRadius: 9,
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: valid && !loading ? "pointer" : "not-allowed",
              transition: "background 0.15s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {loading && (
              <span
                style={{
                  width: 14, height: 14, border: "2px solid #4B5563",
                  borderTopColor: "#9CA3AF", borderRadius: "50%",
                  display: "inline-block", animation: "spin 0.7s linear infinite",
                }}
              />
            )}
            {loading ? "Submitting…" : "Submit →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#374151" }}>
          Free &nbsp;&middot;&nbsp; No account &nbsp;&middot;&nbsp; Not legal advice
        </div>
      </div>
    </div>
  );
}
