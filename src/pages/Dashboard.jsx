import { Badge, Btn, Card, SectionLabel, STATUS_COLORS, SENT_STATUSES, CATEGORY_META, fmtDate } from "../components/ui.jsx";

// Fixed min-width table — scrolls horizontally on narrow screens
const TABLE_MIN = 520;
const COLS = "minmax(140px, 1fr) 100px 70px 130px 80px 16px";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export default function Dashboard({ cases, loading, onNewCase, onOpenCase }) {
  const total       = cases.length;
  const lettersSent = cases.filter((c) => SENT_STATUSES.has(c.status)).length;
  const wins        = cases.filter((c) => c.status === "Reversed").length;
  const totalAmount = cases.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const stats = [
    { label: "Total Cases",  value: total,                                                    color: "#059669" },
    { label: "Letters Sent", value: lettersSent,                                              color: "#10B981" },
    { label: "Wins",         value: wins,                                                     color: "#10B981" },
    { label: "$ Disputed",   value: totalAmount ? `$${totalAmount.toLocaleString()}` : "$0",  color: "#F59E0B" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Cases</h1>
          <p style={{ color: "#64748B", fontSize: 14 }}>All customer submissions</p>
        </div>
        <Btn onClick={onNewCase} style={{ padding: "9px 20px", flexShrink: 0 }}>+ Add Case</Btn>
      </div>

      {/* Stats — 2-col on small, 4-col on wide */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginBottom: 28 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: "14px 16px" }}>
            <SectionLabel style={{ marginBottom: 4 }}>{s.label}</SectionLabel>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Case list — horizontally scrollable on narrow viewports */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>Loading…</div>
      ) : cases.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 15, color: "#64748B", marginBottom: 8 }}>No cases yet</div>
          <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>Cases appear here when customers submit via the landing page</div>
          <Btn onClick={onNewCase}>Add Case Manually</Btn>
        </Card>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: TABLE_MIN, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: COLS,
                gap: 10,
                padding: "0 14px 10px",
                fontSize: 11,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: 1,
                borderBottom: "1px solid #E2E8F0",
                marginBottom: 4,
              }}
            >
              <div>Procedure / Patient</div>
              <div>Insurer</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Deadline</div>
              <div />
            </div>

            {cases.map((c) => (
              <CaseRow key={c.id} c={c} onClick={() => onOpenCase(c)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseRow({ c, onClick }) {
  const email     = c.notes?.patientEmail || c.patient_email || "";
  const label     = c.patient_name || email || "Unknown";
  const submitted = fmtDate(c.created_at);
  const days      = daysUntil(c.appeal_deadline);
  const deadlineResolved = SENT_STATUSES.has(c.status);
  const deadlineColor = !deadlineResolved && days !== null
    ? days <= 3 ? "#EF4444" : days <= 7 ? "#F59E0B" : "#94A3B8"
    : "#CBD5E1";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 10,
        alignItems: "center",
        padding: "13px 14px",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D7DEE7"; e.currentTarget.style.background = "#E2E8F0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "#FFFFFF"; }}
    >
      {/* Procedure + patient + date */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "#0F172A", fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.procedure || "—"}
        </div>
        <div style={{ fontSize: 12, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}{submitted ? <span style={{ color: "#D7DEE7", marginLeft: 8 }}>{submitted}</span> : null}
        </div>
      </div>

      {/* Insurer */}
      <div style={{ fontSize: 13, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {c.insurer || "—"}
      </div>

      {/* Amount */}
      <div style={{ fontSize: 13, fontWeight: 600, color: c.amount ? "#F59E0B" : "#CBD5E1" }}>
        {c.amount ? `$${Number(c.amount).toLocaleString()}` : "—"}
      </div>

      {/* Status + category badges */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Badge color={STATUS_COLORS[c.status] || "#64748B"}>{c.status}</Badge>
        {c.denial_category && CATEGORY_META[c.denial_category] && (
          <Badge color={CATEGORY_META[c.denial_category].color}>
            {CATEGORY_META[c.denial_category].label}
          </Badge>
        )}
      </div>

      {/* Deadline */}
      <div style={{ fontSize: 12, color: deadlineColor, fontWeight: days !== null && days <= 7 && !deadlineResolved ? 600 : 400 }}>
        {c.appeal_deadline
          ? deadlineResolved
            ? <span style={{ color: "#CBD5E1" }}>Filed</span>
            : days !== null && days >= 0
              ? `${days}d left`
              : <span style={{ color: "#EF4444" }}>Overdue</span>
          : <span style={{ color: "#D7DEE7" }}>—</span>}
      </div>

      {/* Arrow */}
      <div style={{ color: "#D7DEE7", fontSize: 16, textAlign: "right" }}>›</div>
    </div>
  );
}
