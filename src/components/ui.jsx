// Shared UI primitives

export const STATUS_COLORS = {
  Processing:               "#8B5CF6",
  New:                      "#059669",
  Analyzing:                "#8B5CF6",
  "Info Needed":            "#F59E0B",
  "Appeal Drafted":         "#F59E0B",
  "Letter Ready":           "#059669",
  "Letter Sent":            "#10B981",
  "Provider Action Needed": "#F97316",
  "Following Up":           "#F97316",
  Reversed:                 "#10B981",
  Upheld:                   "#EF4444",
  Escalated:                "#EF4444",
  Error:                    "#EF4444",
};

// Denial category display metadata
export const CATEGORY_META = {
  medical_necessity: { label: "Medical Necessity", color: "#059669" },
  experimental:      { label: "Experimental",      color: "#8B5CF6" },
  prior_auth:        { label: "Prior Auth",         color: "#8B5CF6" },
  plan_exclusion:    { label: "Plan Exclusion",     color: "#F97316" },
  out_of_network:    { label: "Out of Network",     color: "#14B8A6" },
  billing_error:     { label: "Billing Error",      color: "#F59E0B" },
  late_filing:       { label: "Late Filing",        color: "#64748B" },
  eligibility:       { label: "Eligibility",        color: "#64748B" },
};

export const STATUSES = Object.keys(STATUS_COLORS);

// Statuses that represent a letter having been produced/sent
export const SENT_STATUSES = new Set([
  "Letter Ready", "Letter Sent", "Provider Action Needed",
  "Following Up", "Reversed", "Upheld", "Escalated",
]);

// Shared date formatter — handles both "2024-01-15 10:00:00" and ISO strings
export function fmtDate(str, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!str) return "—";
  try {
    return new Date(str.includes("T") ? str : str + "Z").toLocaleDateString("en-US", opts);
  } catch { return "—"; }
}

// Customer-facing status map — single source of truth
export const STATUS_MAP = {
  Processing:       { label: "In Progress",    color: "#8B5CF6", step: 1, msg: "We're analyzing your denial and building your appeal strategy." },
  Analyzing:        { label: "In Progress",    color: "#8B5CF6", step: 1, msg: "Analyzing your denial and calculating your chances." },
  "Info Needed":    { label: "Info Needed",    color: "#F59E0B", step: 1, msg: "We need a few more details to draft your letter. Check your email for our request." },
  "Appeal Drafted": { label: "In Progress",    color: "#F59E0B", step: 2, msg: "Your appeal letter is being finalized." },
  "Letter Ready":   { label: "Letter Ready",   color: "#059669", step: 2, msg: "Your appeal letter is ready and has been emailed to you." },
  "Letter Sent":    { label: "Filed",          color: "#10B981", step: 3, msg: "Your appeal has been filed with your insurance company." },
  "Provider Action Needed": { label: "Provider Notified", color: "#F97316", step: 2, msg: "Your provider's billing office has been notified. They need to resubmit a corrected claim." },
  "Following Up":   { label: "Following Up",   color: "#F97316", step: 3, msg: "Your letter was sent. We're monitoring for a response." },
  Reversed:         { label: "Won",            color: "#10B981", step: 4, msg: "Your denial was reversed. The appeal worked." },
  Upheld:           { label: "Upheld",         color: "#EF4444", step: 3, msg: "The internal appeal was upheld. Consider requesting an external review." },
  Escalated:        { label: "Escalated",      color: "#EF4444", step: 3, msg: "This case has been escalated for further review." },
  Error:            { label: "Error",          color: "#EF4444", step: 0, msg: "Something went wrong. Please contact support." },
};

export const INSURERS = [
  "UnitedHealth", "Anthem/BCBS", "Cigna", "Aetna", "Humana",
  "Molina Healthcare", "Centene", "Kaiser Permanente", "Medicare", "Medicaid", "Other",
];

export const DENIAL_TYPES = [
  "Prior Authorization Denied", "Medical Necessity Denied", "Out-of-Network",
  "Experimental/Investigational", "Duplicate Claim", "Coding Error",
  "Benefit Limit Exceeded", "Pre-existing Condition", "Timely Filing", "Other",
];

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "#059669" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid #E2E8F0",
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", loading, disabled, style }) {
  const variants = {
    primary: { background: "#059669", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#64748B", border: "1px solid #E2E8F0" },
    subtle:  { background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" },
    success: { background: "#10B981", color: "#fff", border: "none" },
    danger:  { background: "#EF4444", color: "#fff", border: "none" },
  };
  return (
    <button
      disabled={loading || disabled}
      onClick={onClick}
      style={{
        padding: "9px 18px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        opacity: loading || disabled ? 0.55 : 1,
        transition: "opacity 0.15s",
        fontFamily: "inherit",
        ...variants[variant],
        ...style,
      }}
    >
      {loading && <Spinner size={13} color={variant === "primary" || variant === "success" ? "#fff" : "#059669"} />}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ color, children }) {
  return (
    <span
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}3a`,
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── Progress ring ─────────────────────────────────────────────────────────────
export function ProgressRing({ value, size = 80 }) {
  const clamped = Math.min(100, Math.max(0, value || 0));
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (clamped / 100) * circ;
  const color = clamped >= 70 ? "#10B981" : clamped >= 45 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={7} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        style={{
          transform: `rotate(90deg) translate(0,-${size}px)`,
          transformOrigin: `${size / 2}px ${size / 2}px`,
        }}
        fill={color}
        fontSize={size < 70 ? 13 : 17}
        fontWeight={700}
        fontFamily="DM Sans, sans-serif"
      >
        {clamped}%
      </text>
    </svg>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
export function Field({ label, value, onChange, placeholder, options, type = "text", required, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, color: "#64748B", marginBottom: 6, fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: "#EF4444" }}> *</span>}
      </label>
      {type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
      {hint && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: 12,
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Error message ─────────────────────────────────────────────────────────────
export function ErrorMsg({ children }) {
  if (!children) return null;
  return (
    <div
      style={{
        background: "#EF444411",
        border: "1px solid #EF444430",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        color: "#EF4444",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
