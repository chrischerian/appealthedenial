// Shared UI primitives

export const STATUS_COLORS = {
  Processing: "#8B5CF6",
  New: "#3B82F6",
  Analyzing: "#8B5CF6",
  "Appeal Drafted": "#F59E0B",
  "Letter Sent": "#10B981",
  "Following Up": "#F97316",
  Reversed: "#10B981",
  Upheld: "#EF4444",
  Escalated: "#EF4444",
  Error: "#EF4444",
};

export const STATUSES = Object.keys(STATUS_COLORS);

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
export function Spinner({ size = 16, color = "#3B82F6" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid #1a2640",
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
    primary: { background: "#3B82F6", color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: "#6B7280", border: "1px solid #1e2d45" },
    subtle:  { background: "#0f1827", color: "#9CA3AF", border: "1px solid #1e2d45" },
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
      {loading && <Spinner size={13} color={variant === "primary" || variant === "success" ? "#fff" : "#3B82F6"} />}
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2640" strokeWidth={7} />
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
      <label style={{ display: "block", fontSize: 13, color: "#9CA3AF", marginBottom: 6, fontWeight: 500 }}>
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
      {hint && <div style={{ fontSize: 12, color: "#4B5563", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#0f1827",
        border: "1px solid #1a2640",
        borderRadius: 12,
        padding: 20,
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
        color: "#4B5563",
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
