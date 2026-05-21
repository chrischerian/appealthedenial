export default function Landing({ navigate }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 48 }}>
        CoverFight
      </div>

      {/* Headline */}
      <h1
        style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          marginBottom: 24,
          maxWidth: 640,
          color: "#EFF6FF",
        }}
      >
        Your insurance said no.
        <br />
        <span style={{ color: "#3B82F6" }}>We say fight back.</span>
      </h1>

      {/* Sub */}
      <p
        style={{
          fontSize: 18,
          color: "#6B7280",
          lineHeight: 1.65,
          maxWidth: 420,
          marginBottom: 48,
        }}
      >
        Fill out one form. We analyze your denial, write a formal appeal letter,
        and email it to you. You don't lift a finger.
      </p>

      {/* CTA */}
      <button
        onClick={() => navigate("/submit")}
        style={{
          background: "#3B82F6",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "17px 40px",
          fontSize: 17,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: -0.2,
          transition: "background 0.15s, transform 0.1s",
          marginBottom: 20,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#2563EB")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#3B82F6")}
      >
        Fight My Denial &rarr;
      </button>

      <div style={{ fontSize: 13, color: "#374151" }}>
        Free &nbsp;&middot;&nbsp; No account needed &nbsp;&middot;&nbsp; Takes 2 minutes
      </div>

      {/* Social proof / trust */}
      <div
        style={{
          marginTop: 80,
          display: "flex",
          gap: 40,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          { stat: "68%", label: "average win rate" },
          { stat: "< 3 min", label: "to submit" },
          { stat: "24 hrs", label: "letter delivery" },
        ].map((s) => (
          <div key={s.stat} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#EFF6FF", marginBottom: 4 }}>{s.stat}</div>
            <div style={{ fontSize: 12, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Admin link — subtle */}
      <div style={{ position: "fixed", bottom: 16, right: 20 }}>
        <a
          href="/admin"
          style={{ fontSize: 11, color: "#1e2d42", textDecoration: "none" }}
          onClick={(e) => { e.preventDefault(); navigate("/admin"); }}
        >
          Admin
        </a>
      </div>
    </div>
  );
}
