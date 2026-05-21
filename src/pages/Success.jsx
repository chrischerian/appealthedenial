export default function Success({ email, navigate }) {
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
      {/* Check icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#10B98118",
          border: "1px solid #10B98130",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          fontSize: 28,
        }}
      >
        &#x2713;
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>
        CoverFight
      </div>

      <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, marginBottom: 16, color: "#EFF6FF" }}>
        We're on it.
      </h1>

      <p style={{ fontSize: 17, color: "#6B7280", lineHeight: 1.7, maxWidth: 400, marginBottom: 12 }}>
        We're analyzing your denial and writing your appeal letter.
      </p>

      {email && (
        <p style={{ fontSize: 15, color: "#9CA3AF", marginBottom: 48 }}>
          We'll email it to{" "}
          <span style={{ color: "#EFF6FF", fontWeight: 500 }}>{email}</span>{" "}
          when it's ready.
        </p>
      )}

      <p style={{ fontSize: 14, color: "#4B5563", marginBottom: 40 }}>
        You don't need to do anything else.
      </p>

      {/* Status link */}
      {email && (
        <button
          onClick={() => navigate(`/status?email=${encodeURIComponent(email)}`)}
          style={{
            background: "transparent",
            border: "1px solid #1a2640",
            borderRadius: 8,
            color: "#6B7280",
            padding: "10px 22px",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 40,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3B82F6")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a2640")}
        >
          Check status &rarr;
        </button>
      )}

      <button
        onClick={() => navigate("/")}
        style={{ background: "none", border: "none", color: "#374151", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
      >
        &larr; Back to home
      </button>
    </div>
  );
}
