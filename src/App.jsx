
import { useState, useEffect, useRef, useCallback } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const T = {
  bg: "#0A0E1A",
  bgCard: "#111827",
  bgCardHover: "#1a2235",
  border: "#1e2d45",
  borderLight: "#2a3f5f",
  accent: "#3B82F6",
  accentGlow: "rgba(59,130,246,0.15)",
  accentDim: "#1d4ed8",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  muted: "#6B7280",
  dim: "#374151",
  text: "#F9FAFB",
  textSec: "#9CA3AF",
  textDim: "#4B5563",
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', system-ui, sans-serif",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: ${T.sans}; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
  input, textarea, select { background: ${T.bgCard}; border: 1px solid ${T.border}; color: ${T.text}; font-family: ${T.sans}; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; width: 100%; transition: border 0.2s; }
  input:focus, textarea:focus, select:focus { border-color: ${T.accent}; }
  textarea { resize: vertical; min-height: 80px; }
  button { cursor: pointer; font-family: ${T.sans}; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; transition: all 0.18s; }
  select option { background: ${T.bgCard}; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .fade-in { animation: fadeIn 0.3s ease both; }
  .spinner { width: 16px; height: 16px; border: 2px solid ${T.border}; border-top-color: ${T.accent}; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
`;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const DENIAL_TYPES = [
  "Prior Authorization Denied", "Medical Necessity Denied", "Out-of-Network",
  "Experimental/Investigational", "Duplicate Claim", "Coding Error",
  "Benefit Limit Exceeded", "Pre-existing Condition", "Other"
];
const INSURANCE_COS = [
  "UnitedHealth", "Anthem/BCBS", "Cigna", "Aetna", "Humana",
  "Molina Healthcare", "Centene", "Kaiser Permanente", "Other"
];
const STATUS_COLORS = {
  "New": T.accent, "In Progress": T.warn, "Appealing": "#8B5CF6",
  "Reversed": T.success, "Upheld": T.danger, "Escalated": "#F97316"
};

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const store = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); } catch {}
  }
};

// ─── AI CALL ────────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMsg, onChunk) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json",
    "x-api-key": "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",
    "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: !!onChunk,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }]
    })
  });

  if (onChunk) {
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const j = JSON.parse(data);
          if (j.type === "content_block_delta" && j.delta?.text) onChunk(j.delta.text);
        } catch {}
      }
    }
    return;
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "";
}

// ─── ANALYZE DENIAL ──────────────────────────────────────────────────────────
async function analyzeDenial(denial) {
  const sys = `You are an expert insurance appeals attorney and patient advocate. Analyze insurance denials and return ONLY valid JSON.`;
  const prompt = `Analyze this insurance denial and return JSON with keys:
- summary (string, 1 sentence)
- strategy (string, best appeal approach 2-3 sentences)
- winProbability (number 0-100)
- urgency ("low"|"medium"|"high")
- keyArgs (array of 3-5 strings, strongest arguments for appeal)
- nextSteps (array of 4-6 strings, ordered action items)
- timeframe (string, typical resolution timeline)
- escalationPath (array of 3 strings, escalation options if denied again)

Denial info:
Type: ${denial.type}
Insurance: ${denial.insurer}
Procedure/Treatment: ${denial.procedure}
Denial reason given: ${denial.reason}
Amount: $${denial.amount || "unknown"}
Doctor's specialty: ${denial.specialty || "unknown"}`;

  const raw = await callAI(sys, prompt);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { summary: "Analysis complete", strategy: raw, winProbability: 65, urgency: "medium", keyArgs: [], nextSteps: [], timeframe: "30-90 days", escalationPath: [] };
  }
}

// ─── GENERATE LETTER ─────────────────────────────────────────────────────────
async function generateLetter(denial, analysis, onChunk) {
  const sys = `You are an expert insurance appeals attorney. Write formal, persuasive appeal letters that cite federal law (ACA, ERISA, HIPAA) and medical standards. Be professional, specific, and assertive.`;
  const prompt = `Write a complete formal insurance appeal letter for:
Patient: ${denial.patientName || "Patient"}
Insurance Company: ${denial.insurer}
Policy/Member ID: ${denial.policyId || "[MEMBER ID]"}
Procedure/Treatment: ${denial.procedure}
Denial Type: ${denial.type}
Denial Reason Given: ${denial.reason}
Treating Physician: ${denial.doctorName || "Treating Physician"}, ${denial.specialty || "MD"}
Best Arguments: ${analysis.keyArgs?.join("; ")}

Include:
1. Proper formal header and date
2. Clear statement of appeal
3. Medical necessity argument
4. Relevant legal citations (cite specific laws)
5. Demand for peer-to-peer review
6. Request for names/credentials of reviewing personnel
7. Deadline for response (30 days)
8. Signature block

Make it firm, professional, and legally grounded.`;

  await callAI(sys, prompt, onChunk);
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Badge({ color, children }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 500
    }}>{children}</span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "20px 24px",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color 0.2s, background 0.2s",
      ...(onClick ? { ":hover": { background: T.bgCardHover } } : {}),
      ...style
    }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", loading, style, disabled }) {
  const styles = {
    primary: { background: T.accent, color: "#fff" },
    ghost: { background: "transparent", color: T.textSec, border: `1px solid ${T.border}` },
    danger: { background: T.danger, color: "#fff" },
    success: { background: T.success, color: "#fff" },
  };
  return (
    <button disabled={loading || disabled} onClick={onClick} style={{
      padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8,
      opacity: (loading || disabled) ? 0.6 : 1,
      ...styles[variant], ...style
    }}>
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

function ProgressRing({ value, size = 72 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (value / 100) * circ;
  const color = value >= 70 ? T.success : value >= 45 ? T.warn : T.danger;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg) translate(0, -${size}px)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={color} fontSize={16} fontWeight={600} fontFamily={T.sans}>{value}%</text>
    </svg>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function Dashboard({ cases, setView, setActiveDenial }) {
  const stats = {
    total: cases.length,
    active: cases.filter(c => ["New", "In Progress", "Appealing", "Escalated"].includes(c.status)).length,
    won: cases.filter(c => c.status === "Reversed").length,
    winRate: cases.length ? Math.round((cases.filter(c => c.status === "Reversed").length / cases.length) * 100) : 0
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>Your Appeals</h1>
        <p style={{ color: T.textSec }}>Track, fight, and win insurance denials.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Total Cases", val: stats.total, color: T.accent },
          { label: "Active", val: stats.active, color: T.warn },
          { label: "Won", val: stats.won, color: T.success },
          { label: "Win Rate", val: `${stats.winRate}%`, color: T.success }
        ].map(s => (
          <div key={s.label} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* New case CTA */}
      <Btn onClick={() => setView("intake")} style={{ marginBottom: 28, padding: "12px 28px", fontSize: 15 }}>
        + File New Denial
      </Btn>

      {/* Cases list */}
      {cases.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No cases yet</div>
          <div style={{ fontSize: 14 }}>File your first denied claim to get started</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cases.map(c => (
            <div key={c.id} onClick={() => { setActiveDenial(c); setView("detail"); }}
              style={{
                background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
                transition: "border-color 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.borderLight}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{c.procedure}</div>
                <div style={{ fontSize: 13, color: T.textSec }}>{c.insurer} · {c.type}</div>
              </div>
              {c.amount && <div style={{ fontSize: 15, fontWeight: 600, color: T.warn }}>${Number(c.amount).toLocaleString()}</div>}
              <Badge color={STATUS_COLORS[c.status] || T.muted}>{c.status}</Badge>
              {c.analysis?.winProbability != null && (
                <div style={{ fontSize: 12, color: T.textSec, textAlign: "center" }}>
                  <div style={{ color: c.analysis.winProbability >= 60 ? T.success : T.warn, fontWeight: 600, fontSize: 16 }}>
                    {c.analysis.winProbability}%
                  </div>
                  <div>win odds</div>
                </div>
              )}
              <div style={{ color: T.textDim, fontSize: 18 }}>›</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IntakeWizard({ onSubmit, setView }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    procedure: "", type: "", insurer: "", reason: "", amount: "",
    policyId: "", patientName: "", doctorName: "", specialty: "", notes: ""
  });
  const [loading, setLoading] = useState(false);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const F = (label, key, as = "input", opts) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: T.textSec, marginBottom: 6 }}>{label}</label>
      {as === "select" ? (
        <select value={form[key]} onChange={e => up(key, e.target.value)}>
          <option value="">Select…</option>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={form[key]} onChange={e => up(key, e.target.value)} placeholder={opts} />
      ) : (
        <input value={form[key]} onChange={e => up(key, e.target.value)} placeholder={opts} />
      )}
    </div>
  );

  const steps = [
    {
      title: "What was denied?",
      content: (
        <>
          {F("Procedure / Treatment / Medication", "procedure", "input", "e.g. MRI of lower spine, Humira, physical therapy")}
          {F("Denial Type", "type", "select", DENIAL_TYPES)}
          {F("Insurance Company", "insurer", "select", INSURANCE_COS)}
          {F("Denial Reason (as stated)", "reason", "textarea", "Copy the exact reason given on your denial letter")}
        </>
      ),
      valid: form.procedure && form.type && form.insurer && form.reason
    },
    {
      title: "Claim details",
      content: (
        <>
          {F("Claim Amount ($)", "amount", "input", "e.g. 4500")}
          {F("Policy / Member ID", "policyId", "input", "Found on your insurance card")}
          {F("Patient Name", "patientName", "input", "Full name")}
          {F("Treating Doctor", "doctorName", "input", "Dr. Jane Smith")}
          {F("Doctor's Specialty", "specialty", "input", "e.g. Orthopedic Surgery, Psychiatry")}
        </>
      ),
      valid: true
    },
    {
      title: "Additional context",
      content: (
        <>
          {F("Additional Notes", "notes", "textarea", "Any relevant medical history, previous authorizations, or context that supports your case")}
          <div style={{ background: `${T.accent}11`, border: `1px solid ${T.accent}33`, borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ fontSize: 13, color: T.accent, fontWeight: 500, marginBottom: 4 }}>What happens next</div>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
              Our AI will analyze your denial, calculate your win probability, generate a formal appeal letter, and give you a step-by-step action plan.
            </div>
          </div>
        </>
      ),
      valid: true
    }
  ];

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(form);
  };

  return (
    <div className="fade-in" style={{ maxWidth: 580, margin: "0 auto" }}>
      <button onClick={() => setView("dashboard")} style={{ background: "none", color: T.textSec, marginBottom: 24, fontSize: 14 }}>
        ← Back
      </button>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{steps[step].title}</h2>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 3, flex: 1, borderRadius: 2,
              background: i <= step ? T.accent : T.border,
              transition: "background 0.3s"
            }} />
          ))}
        </div>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
        {steps[step].content}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Btn>}
        {step < steps.length - 1 ? (
          <Btn onClick={() => setStep(s => s + 1)} disabled={!steps[step].valid}>Continue →</Btn>
        ) : (
          <Btn onClick={handleSubmit} loading={loading}>Analyze Denial →</Btn>
        )}
      </div>
    </div>
  );
}

function DenialDetail({ denial, onUpdate, setView }) {
  const [letterText, setLetterText] = useState(denial.letter || "");
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("analysis");
  const [chatMsg, setChatMsg] = useState("");
  const [chat, setChat] = useState(denial.chat || []);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const handleGenerateLetter = async () => {
    setGenerating(true);
    setTab("letter");
    setLetterText("");
    await generateLetter(denial, denial.analysis, chunk => setLetterText(t => t + chunk));
    const updated = { ...denial, letter: letterText };
    onUpdate(updated);
    setGenerating(false);
  };

  const handleChat = async () => {
    if (!chatMsg.trim()) return;
    const msg = chatMsg;
    setChatMsg("");
    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat);
    setChatLoading(true);

    const sys = `You are an expert insurance appeals attorney helping a patient fight a denial.
Context: ${JSON.stringify({ type: denial.type, insurer: denial.insurer, procedure: denial.procedure, reason: denial.reason, analysis: denial.analysis })}
Answer concisely and practically. Cite laws when relevant (ACA, ERISA, HIPAA).`;

    let reply = "";
    const msgs = newChat.map(m => ({ role: m.role, content: m.content }));

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json",
    "x-api-key": "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",
    "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, stream: true, system: sys, messages: msgs })
    });

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.type === "content_block_delta" && j.delta?.text) {
            reply += j.delta.text;
            setChat([...newChat, { role: "assistant", content: reply }]);
          }
        } catch {}
      }
    }

    const finalChat = [...newChat, { role: "assistant", content: reply }];
    setChat(finalChat);
    onUpdate({ ...denial, chat: finalChat });
    setChatLoading(false);
  };

  const a = denial.analysis;
  const TABS = ["analysis", "letter", "steps", "chat"];

  return (
    <div className="fade-in">
      <button onClick={() => setView("dashboard")} style={{ background: "none", color: T.textSec, marginBottom: 20, fontSize: 14 }}>
        ← All Cases
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{denial.procedure}</h2>
          <div style={{ color: T.textSec, fontSize: 14 }}>{denial.insurer} · {denial.type}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {denial.amount && <div style={{ fontWeight: 600, fontSize: 18, color: T.warn }}>${Number(denial.amount).toLocaleString()}</div>}
          <select value={denial.status} onChange={e => onUpdate({ ...denial, status: e.target.value })}
            style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>
            {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Win prob + urgency */}
      {a && (
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 20, alignItems: "center" }}>
          <ProgressRing value={a.winProbability || 0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: T.textDim, marginBottom: 4 }}>AI Assessment</div>
            <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>{a.summary}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Badge color={a.urgency === "high" ? T.danger : a.urgency === "medium" ? T.warn : T.success}>
                {a.urgency} urgency
              </Badge>
              <Badge color={T.accent}>{a.timeframe}</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: T.bgCard, borderRadius: 10, padding: 4, border: `1px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 500, textTransform: "capitalize",
            background: tab === t ? T.accent : "transparent",
            color: tab === t ? "#fff" : T.textSec
          }}>{t}</button>
        ))}
      </div>

      {/* Analysis Tab */}
      {tab === "analysis" && a && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Strategy</div>
            <p style={{ lineHeight: 1.7, color: T.textSec }}>{a.strategy}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Key Arguments</div>
              {(a.keyArgs || []).map((arg, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${T.accent}22`, color: T.accent, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.5 }}>{arg}</div>
                </div>
              ))}
            </div>
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>If Denied Again</div>
              {(a.escalationPath || []).map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.warn, flexShrink: 0, marginTop: 7 }} />
                  <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.5 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Letter Tab */}
      {tab === "letter" && (
        <div className="fade-in">
          {!letterText && !generating ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 14, color: T.textSec, marginBottom: 20 }}>Generate a formal appeal letter with legal citations</div>
              <Btn onClick={handleGenerateLetter}>Generate Appeal Letter</Btn>
            </div>
          ) : (
            <>
              <div style={{
                background: "#0d1117", border: `1px solid ${T.border}`, borderRadius: 12, padding: 24,
                fontFamily: T.mono, fontSize: 13, lineHeight: 1.8, color: "#c9d1d9",
                whiteSpace: "pre-wrap", maxHeight: 480, overflowY: "auto", marginBottom: 16
              }}>
                {letterText}
                {generating && <span style={{ animation: "pulse 1s infinite", display: "inline-block", marginLeft: 4 }}>▌</span>}
              </div>
              {!generating && (
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => navigator.clipboard.writeText(letterText)} variant="ghost">Copy Letter</Btn>
                  <Btn onClick={handleGenerateLetter} variant="ghost">Regenerate</Btn>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Steps Tab */}
      {tab === "steps" && a && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(a.nextSteps || []).map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 16, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: `${T.accent}22`, color: T.accent,
                fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>{i + 1}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, paddingTop: 6 }}>{step}</div>
            </div>
          ))}

          {/* HIPAA tip */}
          <div style={{ background: `${T.warn}11`, border: `1px solid ${T.warn}33`, borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.warn, marginBottom: 4 }}>Know Your Rights</div>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
              By law, you can request the names and credentials of everyone who reviewed your claim. Call the insurer and ask for their "HIPAA Compliance/Privacy Officer." Any refusal can be reported to OCR.gov as a potential violation.
            </div>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: 420 }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12, paddingRight: 4 }}>
            {chat.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted, fontSize: 14 }}>
                Ask me anything about your denial — laws, scripts, what to say when you call, next steps…
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%", background: m.role === "user" ? T.accent : T.bgCard,
                border: `1px solid ${m.role === "user" ? "transparent" : T.border}`,
                borderRadius: 10, padding: "10px 14px", fontSize: 14, lineHeight: 1.6
              }}>
                {m.content}
                {chatLoading && i === chat.length - 1 && m.role === "assistant" && (
                  <span style={{ animation: "pulse 1s infinite", display: "inline-block", marginLeft: 4 }}>▌</span>
                )}
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
              placeholder="What exactly should I say when I call?" style={{ flex: 1 }} />
            <Btn onClick={handleChat} loading={chatLoading} style={{ padding: "10px 16px" }}>→</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function RightsGuide() {
  const rights = [
    {
      title: "Right to Appeal", icon: "⚖️", color: T.accent,
      body: "Under the ACA, you have the right to appeal any insurance denial. Internal appeals must be resolved in 30 days (urgent) or 60 days (non-urgent). You're entitled to a full and fair review.",
      law: "ACA § 2719"
    },
    {
      title: "External Review", icon: "🏛️", color: "#8B5CF6",
      body: "If your internal appeal is denied, you can request an independent external review by a third party. This is federally mandated and the reviewer's decision is binding on your insurer.",
      law: "ACA External Review"
    },
    {
      title: "Reviewer Credentials", icon: "📋", color: T.warn,
      body: "You have the right to request the names and credentials of every person who reviewed your claim and made the denial decision. Ask for the HIPAA Privacy/Compliance Officer.",
      law: "HIPAA § 164"
    },
    {
      title: "ERISA Protections", icon: "🛡️", color: T.success,
      body: "If your coverage is through an employer, ERISA gives you the right to a complete copy of your plan documents, a written explanation of any denial, and the right to sue if wrongfully denied.",
      law: "ERISA § 502(a)"
    },
    {
      title: "Peer-to-Peer Review", icon: "👨‍⚕️", color: T.accent,
      body: "Your doctor can request a peer-to-peer review, speaking directly with the insurance company's medical reviewer. This alone reverses many denials. Ask your doctor's office to initiate this.",
      law: "State regulations vary"
    },
    {
      title: "State Insurance Commissioner", icon: "🏢", color: T.danger,
      body: "Your state's insurance commissioner regulates insurers. Filing a complaint often triggers a formal review. Many states have patient advocacy offices specifically for denied claims.",
      law: "State insurance law"
    }
  ];

  const scripts = [
    { title: "Opening call script", text: `"I'm calling to initiate a formal appeal for claim #[NUMBER]. I'd like to speak with your HIPAA Compliance/Privacy Officer. I'm also requesting the names and full credentials of every person who reviewed and denied this claim."` },
    { title: "Peer-to-peer request", text: `"I need to speak with my doctor about initiating a peer-to-peer review with your medical director. Can you provide the direct line and the name of the reviewing physician?"` },
    { title: "Escalation statement", text: `"I want to document that I'm invoking my right to an independent external review under federal law. Please provide written confirmation of this request within 1 business day."` }
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Know Your Rights</h2>
        <p style={{ color: T.textSec }}>Federal and state laws that protect you from wrongful denials.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        {rights.map(r => (
          <div key={r.title} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{r.icon}</span>
              <div style={{ fontWeight: 500 }}>{r.title}</div>
              <Badge color={r.color}>{r.law}</Badge>
            </div>
            <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.7 }}>{r.body}</p>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Call Scripts</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scripts.map(s => (
          <div key={s.title} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 13, color: T.textDim, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{s.title}</div>
            <div style={{ fontFamily: T.mono, fontSize: 13, color: "#a8d0ff", lineHeight: 1.7, background: "#0d1117", borderRadius: 8, padding: 14 }}>{s.text}</div>
            <Btn variant="ghost" onClick={() => navigator.clipboard.writeText(s.text)} style={{ marginTop: 10, padding: "6px 14px", fontSize: 12 }}>Copy</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP SHELL ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [activeDenial, setActiveDenial] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    store.get("coverfight:cases").then(d => { if (d) setCases(d); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (loaded) store.set("coverfight:cases", cases);
  }, [cases, loaded]);

  const addCase = async (form) => {
    const denial = {
      ...form, id: Date.now().toString(), status: "New",
      createdAt: new Date().toISOString(), analysis: null, letter: "", chat: []
    };
    const analysis = await analyzeDenial(denial);
    denial.analysis = analysis;
    setCases(prev => [denial, ...prev]);
    setActiveDenial(denial);
    setView("detail");
  };

  const updateCase = (updated) => {
    setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
    setActiveDenial(updated);
  };

  const NAV = [
    { key: "dashboard", label: "Cases", icon: "⊞" },
    { key: "rights", label: "Rights", icon: "⚖" },
  ];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{
          width: 220, background: T.bgCard, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0
        }}>
          <div style={{ padding: "0 8px 24px", borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>CoverFight</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>insurance advocate</div>
          </div>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setView(n.key)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, background: view === n.key ? `${T.accent}22` : "transparent",
              color: view === n.key ? T.accent : T.textSec, fontSize: 14, fontWeight: 500,
              marginBottom: 4, textAlign: "left", border: "none"
            }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span> {n.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 8px", fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
            Not legal advice. Consult an attorney for complex cases.
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto", maxWidth: 900 }}>
          {view === "dashboard" && <Dashboard cases={cases} setView={setView} setActiveDenial={setActiveDenial} />}
          {view === "intake" && <IntakeWizard onSubmit={addCase} setView={setView} />}
          {view === "detail" && activeDenial && <DenialDetail denial={activeDenial} onUpdate={updateCase} setView={setView} />}
          {view === "rights" && <RightsGuide />}
        </div>
      </div>
    </>
  );
}
