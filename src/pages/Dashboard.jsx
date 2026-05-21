import { Badge, Btn, Card, SectionLabel, STATUS_COLORS } from "../components/ui.jsx";

const SENT_STATUSES = new Set(["Letter Sent", "Following Up", "Reversed", "Upheld", "Escalated"]);

export default function Dashboard({ cases, loading, onNewCase, onOpenCase }) {
  const total       = cases.length;
  const lettersSent = cases.filter((c) => SENT_STATUSES.has(c.status)).length;
  const wins        = cases.filter((c) => c.status === "Reversed").length;
  const totalAmount = cases.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const stats = [
    { label: "Total Cases",      value: total,                                                color: "#3B82F6" },
    { label: "Letters Sent",     value: lettersSent,                                          color: "#10B981" },
    { label: "Wins",             value: wins,                                                 color: "#10B981" },
    { label: "$ in Dispute",     value: totalAmount ? `$${totalAmount.toLocaleString()}` : "$0", color: "#F59E0B" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Cases</h1>
          <p style={{ color: "#6B7280", fontSize: 14 }}>All customer submissions</p>
        </div>
        <Btn onClick={onNewCase} style={{ padding: "9px 20px" }}>+ Add Case</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {stats.map((s) => (
          <Card key={s.label}>
            <SectionLabel>{s.label}</SectionLabel>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Case list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4B5563" }}>Loading…</div>
      ) : cases.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 8 }}>No cases yet</div>
          <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 24 }}>Cases appear here when customers submit via the landing page</div>
          <Btn onClick={onNewCase}>Add Case Manually</Btn>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 140px 90px 70px 36px",
              gap: 12,
              padding: "0 16px 10px",
              fontSize: 11,
              color: "#4B5563",
              textTransform: "uppercase",
              letterSpacing: 1,
              borderBottom: "1px solid #1a2640",
              marginBottom: 4,
            }}
          >
            <div>Procedure / Patient</div>
            <div>Insurer</div>
            <div>Submitted</div>
            <div>Amount</div>
            <div>Status</div>
            <div />
          </div>

          {cases.map((c) => (
            <CaseRow key={c.id} c={c} onClick={() => onOpenCase(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CaseRow({ c, onClick }) {
  const email = c.notes?.patientEmail || "";
  const label = c.patient_name || email || "Unknown";
  const submitted = c.created_at
    ? new Date(c.created_at.includes("T") ? c.created_at : c.created_at + "Z")
        .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 140px 90px 70px 36px",
        gap: 12,
        alignItems: "center",
        padding: "14px 16px",
        background: "#0f1827",
        border: "1px solid #1a2640",
        borderRadius: 10,
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2a4a7a"; e.currentTarget.style.background = "#111f35"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a2640"; e.currentTarget.style.background = "#0f1827"; }}
    >
      {/* Procedure + patient */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: "#EFF6FF", fontSize: 14, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.procedure || "—"}
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
      </div>

      {/* Insurer */}
      <div style={{ fontSize: 13, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {c.insurer || "—"}
      </div>

      {/* Date */}
      <div style={{ fontSize: 12, color: "#6B7280" }}>{submitted}</div>

      {/* Amount */}
      <div style={{ fontSize: 13, fontWeight: 600, color: c.amount ? "#F59E0B" : "#374151" }}>
        {c.amount ? `$${Number(c.amount).toLocaleString()}` : "—"}
      </div>

      {/* Status badge */}
      <div>
        <Badge color={STATUS_COLORS[c.status] || "#6B7280"}>{c.status}</Badge>
      </div>

      {/* Arrow */}
      <div style={{ color: "#2a3a50", fontSize: 16, textAlign: "right" }}>›</div>
    </div>
  );
}
