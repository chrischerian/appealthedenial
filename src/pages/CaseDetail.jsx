import { useState, useRef, useEffect } from "react";
import {
  Btn, Badge, ProgressRing, Card, SectionLabel, Spinner, ErrorMsg,
  STATUS_COLORS, STATUSES,
} from "../components/ui.jsx";
import * as api from "../api.js";

const SENT_STATUSES = new Set(["Letter Sent", "Following Up", "Reversed", "Upheld", "Escalated"]);

export default function CaseDetail({ denial: initial, onBack, onUpdate }) {
  const [denial, setDenial] = useState(initial);
  const [letter, setLetter] = useState(initial.letter || "");
  const [genLetter, setGenLetter] = useState(false);
  const [letterError, setLetterError] = useState("");
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEnd = useRef(null);

  const a = denial.analysis || {};
  const n = denial.notes || {};
  const timelineEntries = n.timeline || [];

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ── Status update ───────────────────────────────────────────────────────────
  const updateStatus = async (status) => {
    try {
      const updated = await api.updateCase(denial.id, { status });
      setDenial(updated);
      onUpdate(updated);
    } catch {}
  };

  // ── Letter ──────────────────────────────────────────────────────────────────
  const handleGenLetter = async () => {
    setGenLetter(true);
    setLetterError("");
    setLetter("");
    const chunks = [];
    try {
      await api.streamLetter(denial.id, (chunk) => { chunks.push(chunk); });
      setLetter(chunks.join(""));
    } catch (err) {
      setLetterError(err.message || "Failed to generate letter. Please try again.");
    } finally {
      setGenLetter(false);
    }
  };

  const downloadLetter = () => {
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `appeal-case-${denial.id}.txt`;
    el.click();
    URL.revokeObjectURL(url);
  };

  // ── Chat ────────────────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatMsg.trim() || chatLoading) return;
    const msg = chatMsg.trim();
    setChatMsg("");
    const history = [...chat, { role: "user", content: msg }];
    setChat([...history, { role: "assistant", content: "" }]);
    setChatLoading(true);
    const chunks = [];
    try {
      await api.streamChat(history, denial.id, (chunk) => {
        chunks.push(chunk);
        setChat([...history, { role: "assistant", content: chunks.join("") }]);
      });
    } catch {
      setChat([...history, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Agent pipeline ──────────────────────────────────────────────────────────
  const letterReady = !!letter || !!denial.letter;
  const emailSent   = SENT_STATUSES.has(denial.status);
  const analyzing   = denial.status === "Processing" || denial.status === "Analyzing";

  const pipeline = [
    {
      label: "Received",
      sub: "Case submitted",
      done: true,
      active: false,
      ts: denial.created_at,
    },
    {
      label: "Analyzing",
      sub: "Denial analyzed",
      done: !!a.winProbability,
      active: analyzing,
      ts: timelineEntries.find((t) => /analyz/i.test(t.event))?.ts,
    },
    {
      label: "Letter Drafted",
      sub: "Appeal written",
      done: letterReady,
      active: !!a.winProbability && !letterReady && !analyzing,
      ts: timelineEntries.find((t) => /letter|draft/i.test(t.event))?.ts,
    },
    {
      label: "Email Sent",
      sub: "Customer notified",
      done: emailSent,
      active: false,
      ts: timelineEntries.find((t) => /email|sent/i.test(t.event))?.ts,
    },
  ];

  const currentPipelineStep = pipeline.findIndex((s) => s.active);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        style={{ background: "none", color: "#6B7280", marginBottom: 20, fontSize: 14, padding: 0, border: "none", cursor: "pointer" }}
      >
        ← All Cases
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{denial.procedure || "Untitled case"}</h2>
          <div style={{ color: "#6B7280", fontSize: 14 }}>
            {denial.insurer}{denial.denial_type ? ` · ${denial.denial_type}` : ""}
          </div>
          <div style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }}>
            {denial.patient_name && <span>{denial.patient_name}{n.patientEmail ? " · " : ""}</span>}
            {n.patientEmail && <span style={{ color: "#3B82F6" }}>{n.patientEmail}</span>}
            {!denial.patient_name && !n.patientEmail && "Unknown customer"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {denial.amount > 0 && (
            <div style={{ fontWeight: 700, fontSize: 22, color: "#F59E0B" }}>
              ${Number(denial.amount).toLocaleString()}
            </div>
          )}
          <select
            value={denial.status}
            onChange={(e) => updateStatus(e.target.value)}
            style={{ background: "#0f1827", border: "1px solid #1a2640", color: "#EFF6FF", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "auto" }}
          >
            {["Processing", ...STATUSES].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Agent pipeline ────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <SectionLabel>Agent Pipeline</SectionLabel>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {pipeline.map((step, i) => (
            <div key={step.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Connector row */}
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {i > 0 && (
                  <div
                    style={{
                      flex: 1, height: 2,
                      background: pipeline[i - 1].done ? "#3B82F6" : "#1a2640",
                      transition: "background 0.5s",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: step.done ? "#3B82F6" : step.active ? "#1a2640" : "#1a2640",
                    border: `2px solid ${step.done ? "#3B82F6" : step.active ? "#8B5CF6" : "#1a2640"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.4s",
                  }}
                >
                  {step.done ? (
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>✓</span>
                  ) : step.active ? (
                    <Spinner size={14} color="#8B5CF6" />
                  ) : (
                    <span style={{ color: "#374151", fontSize: 12, fontWeight: 600 }}>{i + 1}</span>
                  )}
                </div>
                {i < pipeline.length - 1 && (
                  <div
                    style={{
                      flex: 1, height: 2,
                      background: step.done ? "#3B82F6" : "#1a2640",
                      transition: "background 0.5s",
                    }}
                  />
                )}
              </div>
              {/* Labels */}
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 13, fontWeight: 500,
                    color: step.done ? "#EFF6FF" : step.active ? "#8B5CF6" : "#374151",
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>{step.sub}</div>
                {step.ts && (
                  <div style={{ fontSize: 11, color: "#2a3a52", marginTop: 3 }}>{fmtTs(step.ts)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── AI Assessment bar ─────────────────────────────────────────────────── */}
      {a.winProbability != null && (
        <Card style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>
          <ProgressRing value={a.winProbability} size={88} />
          <div style={{ flex: 1 }}>
            <SectionLabel>AI Assessment</SectionLabel>
            <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12, color: "#D1D5DB" }}>{a.summary}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge color={a.urgency === "high" ? "#EF4444" : a.urgency === "medium" ? "#F59E0B" : "#10B981"}>
                {a.urgency} urgency
              </Badge>
              {a.timeframe && <Badge color="#3B82F6">{a.timeframe}</Badge>}
              {(a.legalCitations || []).slice(0, 3).map((c, i) => (
                <Badge key={i} color="#8B5CF6">{c}</Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Case Info + Strategy ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <SectionLabel>Case Information</SectionLabel>
          <InfoRow label="Customer email"  value={n.patientEmail || "—"} highlight />
          <InfoRow label="Patient name"    value={denial.patient_name || "—"} />
          <InfoRow label="Insurer"         value={denial.insurer || "—"} />
          <InfoRow label="Procedure"       value={denial.procedure || "—"} />
          <InfoRow label="Denial type"     value={denial.denial_type || "—"} />
          <InfoRow label="Denial reason"   value={denial.denial_reason || "—"} />
          <InfoRow label="Member ID"       value={denial.policy_id || "—"} />
          <InfoRow label="Claim #"         value={n.claimNumber || "—"} />
          <InfoRow label="Denial date"     value={n.denialDate || "—"} />
          <InfoRow label="Diagnosis"       value={n.diagnosis || "—"} />
          <InfoRow label="Doctor"          value={denial.doctor_name ? `${denial.doctor_name}${denial.specialty ? `, ${denial.specialty}` : ""}` : "—"} />
          {denial.amount > 0 && <InfoRow label="Claim amount" value={`$${Number(denial.amount).toLocaleString()}`} />}
        </Card>

        {a.strategy ? (
          <Card>
            <SectionLabel>Appeal Strategy</SectionLabel>
            <p style={{ lineHeight: 1.8, color: "#D1D5DB", fontSize: 14, marginBottom: a.escalationPath?.length ? 16 : 0 }}>
              {a.strategy}
            </p>
            {(a.escalationPath || []).length > 0 && (
              <div style={{ borderTop: "1px solid #1a2640", paddingTop: 16 }}>
                <SectionLabel style={{ marginBottom: 8 }}>If Denied Again</SectionLabel>
                {a.escalationPath.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F59E0B", flexShrink: 0, marginTop: 7 }} />
                    <div style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6 }}>{s}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <SectionLabel>Denial Reason</SectionLabel>
            <p style={{ lineHeight: 1.7, color: "#9CA3AF", fontSize: 14 }}>
              {denial.denial_reason || "No denial reason on file."}
            </p>
            {analyzing && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, color: "#8B5CF6", fontSize: 13 }}>
                <Spinner size={13} color="#8B5CF6" />
                Analysis in progress…
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Key Arguments + Evidence ──────────────────────────────────────────── */}
      {(a.keyArgs?.length > 0 || a.evidenceNeeded?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {a.keyArgs?.length > 0 && (
            <Card>
              <SectionLabel>Key Arguments</SectionLabel>
              {a.keyArgs.map((arg, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#3B82F620", color: "#3B82F6",
                      fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 2,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.6 }}>{arg}</div>
                </div>
              ))}
            </Card>
          )}

          {(a.evidenceNeeded?.length > 0 || a.legalCitations?.length > 0) && (
            <Card>
              {a.evidenceNeeded?.length > 0 && (
                <>
                  <SectionLabel>Evidence Needed</SectionLabel>
                  {a.evidenceNeeded.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0, marginTop: 6 }} />
                      <div style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.6 }}>{e}</div>
                    </div>
                  ))}
                </>
              )}
              {a.legalCitations?.length > 0 && (
                <div style={{ marginTop: a.evidenceNeeded?.length ? 16 : 0, borderTop: a.evidenceNeeded?.length ? "1px solid #1a2640" : "none", paddingTop: a.evidenceNeeded?.length ? 16 : 0 }}>
                  <SectionLabel style={{ marginBottom: 8 }}>Legal Citations</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {a.legalCitations.map((c, i) => <Badge key={i} color="#8B5CF6">{c}</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Next Steps ────────────────────────────────────────────────────────── */}
      {a.nextSteps?.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel>Next Steps</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
            {a.nextSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
                <div
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#3B82F620", color: "#3B82F6",
                    fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.6 }}>{s}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Appeal Letter ─────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Appeal Letter</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {letter && !genLetter && (
              <>
                <Btn variant="subtle" onClick={() => navigator.clipboard.writeText(letter)} style={{ padding: "5px 12px", fontSize: 12 }}>Copy</Btn>
                <Btn variant="subtle" onClick={downloadLetter} style={{ padding: "5px 12px", fontSize: 12 }}>Download .txt</Btn>
              </>
            )}
            <Btn onClick={handleGenLetter} loading={genLetter} style={{ padding: "5px 14px", fontSize: 12 }}>
              {letter ? "Regenerate" : "Generate Letter"}
            </Btn>
          </div>
        </div>

        <ErrorMsg>{letterError}</ErrorMsg>

        {genLetter && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "#070c18", borderRadius: 8, color: "#6B7280", fontSize: 13, marginBottom: 12 }}>
            <Spinner size={14} />
            Writing appeal letter… this takes about 20–30 seconds
          </div>
        )}

        {letter ? (
          <div
            style={{
              background: "#070c18",
              border: "1px solid #1a2640",
              borderRadius: 10,
              padding: "24px 28px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12.5,
              lineHeight: 1.95,
              color: "#c9d1d9",
              whiteSpace: "pre-wrap",
              maxHeight: 520,
              overflowY: "auto",
            }}
          >
            {letter}
          </div>
        ) : !genLetter ? (
          <div style={{ textAlign: "center", padding: "32px 20px", color: "#4B5563", fontSize: 14 }}>
            No letter generated yet.
          </div>
        ) : null}
      </Card>

      {/* ── Action Timeline ───────────────────────────────────────────────────── */}
      {timelineEntries.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel>Action Timeline</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timelineEntries.map((t, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  paddingBottom: i < timelineEntries.length - 1 ? 16 : 0,
                  marginBottom: i < timelineEntries.length - 1 ? 0 : 0,
                  position: "relative",
                }}
              >
                {/* Vertical line */}
                {i < timelineEntries.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 14,
                      width: 2,
                      height: "calc(100% - 4px)",
                      background: "#1a2640",
                    }}
                  />
                )}
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3B82F6", flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#D1D5DB" }}>{t.event}</div>
                  <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>{fmtTs(t.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── AI Legal Chat ─────────────────────────────────────────────────────── */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: showChat ? 16 : 0,
          }}
        >
          <SectionLabel style={{ marginBottom: 0 }}>AI Legal Chat</SectionLabel>
          <Btn
            variant="ghost"
            onClick={() => setShowChat((v) => !v)}
            style={{ padding: "5px 14px", fontSize: 12 }}
          >
            {showChat ? "Hide" : "Ask AI about this case"}
          </Btn>
        </div>

        {showChat && (
          <>
            <div
              style={{
                height: 320,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 12,
                paddingRight: 4,
              }}
            >
              {chat.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#4B5563", fontSize: 13 }}>
                  Ask anything about this case — strategy, legal angles, next steps, what to say when calling...
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: m.role === "user" ? "#3B82F6" : "#070c18",
                    border: `1px solid ${m.role === "user" ? "transparent" : "#1a2640"}`,
                    borderRadius: 10,
                    padding: "9px 13px",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#EFF6FF",
                  }}
                >
                  {m.content || (chatLoading && i === chat.length - 1 ? <Spinner size={12} /> : "")}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChat()}
                placeholder="Ask about this case…"
                style={{ flex: 1 }}
              />
              <Btn onClick={handleChat} loading={chatLoading} style={{ padding: "9px 14px" }}>→</Btn>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 9, fontSize: 13 }}>
      <div style={{ color: "#4B5563", minWidth: 100, flexShrink: 0 }}>{label}</div>
      <div
        style={{
          color: highlight ? "#93c5fd" : "#D1D5DB",
          fontWeight: highlight ? 500 : 400,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function fmtTs(str) {
  if (!str) return "";
  try {
    return new Date(str).toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return ""; }
}
