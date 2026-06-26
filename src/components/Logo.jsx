export function Logo({ height = 32 }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg height={height} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Appeal The Denial logo">
        <g transform="rotate(-28 32 32)">
          <rect x="14" y="23" width="36" height="18" rx="9" fill="none" stroke="#059669" strokeWidth="3.5" />
          <path d="M32 23 H41 A9 9 0 0 1 41 41 H32 Z" fill="#059669" />
        </g>
      </svg>
      <span style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 500, fontSize: height * 0.62, color: "#059669", letterSpacing: "-0.01em" }}>
        Appeal The Denial
      </span>
    </div>
  );
}
