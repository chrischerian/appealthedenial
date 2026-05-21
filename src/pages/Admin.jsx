import { useState, useEffect } from "react";
import Dashboard from "./Dashboard.jsx";
import CaseDetail from "./CaseDetail.jsx";
import IntakeWizard from "./IntakeWizard.jsx";
import RightsGuide from "./RightsGuide.jsx";
import * as api from "../api.js";

const PASSWORD = "coverfight2024";
const SESSION_KEY = "cf_admin_auth";

const NAV = [
  { key: "dashboard", label: "Cases",  icon: "▦" },
  { key: "rights",    label: "Rights", icon: "⚖" },
];

// ── Password gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const attempt = () => {
    if (pw === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onAuth();
    } else {
      setError("Incorrect password.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          animation: shake ? "shake 0.4s ease" : "none",
        }}
      >
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-8px)}
            40%{transform:translateX(8px)}
            60%{transform:translateX(-5px)}
            80%{transform:translateX(5px)}
          }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#3B82F6", marginBottom: 10 }}>
            CoverFight
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#EFF6FF" }}>Admin Access</div>
        </div>

        <div style={{ background: "#0f1827", border: "1px solid #1a2640", borderRadius: 12, padding: 28 }}>
          <label style={{ display: "block", fontSize: 13, color: "#9CA3AF", marginBottom: 8, fontWeight: 500 }}>
            Password
          </label>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && attempt()}
            placeholder="Enter admin password"
            autoFocus
            style={{ marginBottom: error ? 8 : 20 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 16 }}>{error}</div>
          )}
          <button
            onClick={attempt}
            style={{
              width: "100%",
              background: "#3B82F6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin shell ───────────────────────────────────────────────────────────────
export default function Admin({ navigate }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [view, setView] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [loadingCases, setLoadingCases] = useState(true);

  useEffect(() => {
    if (!authed) return;
    api.getCases()
      .then((data) => setCases(data))
      .catch(() => {})
      .finally(() => setLoadingCases(false));
  }, [authed]);

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  const handleCaseUpdate = (updated) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActiveCase(updated);
  };

  const handleNewCaseComplete = (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    setActiveCase(newCase);
    setView("detail");
  };

  const openCase = (c) => {
    setActiveCase(c);
    setView("detail");
  };

  const signOut = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          background: "#070c18",
          borderRight: "1px solid #1a2640",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0 8px 24px", borderBottom: "1px solid #1a2640", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#EFF6FF" }}>CoverFight</div>
          <div style={{ fontSize: 11, color: "#2a3a52", marginTop: 3 }}>Admin Dashboard</div>
        </div>

        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8,
              background: view === n.key ? "#3B82F618" : "transparent",
              color: view === n.key ? "#3B82F6" : "#6B7280",
              fontSize: 14, fontWeight: 500, marginBottom: 4,
              textAlign: "left", border: "none", cursor: "pointer",
              width: "100%", fontFamily: "inherit",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px", borderRadius: 8, marginBottom: 4,
            background: "transparent", color: "#374151",
            fontSize: 12, border: "none", cursor: "pointer",
            width: "100%", fontFamily: "inherit",
          }}
        >
          ← Customer site
        </button>
        <button
          onClick={signOut}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px", borderRadius: 8, marginBottom: 8,
            background: "transparent", color: "#374151",
            fontSize: 12, border: "none", cursor: "pointer",
            width: "100%", fontFamily: "inherit",
          }}
        >
          Sign out
        </button>

        <div style={{ padding: "8px", fontSize: 11, color: "#1e2d42", lineHeight: 1.5 }}>
          Not legal advice.
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="fade-in" key={view}>
            {view === "dashboard" && (
              <Dashboard
                cases={cases}
                loading={loadingCases}
                onNewCase={() => setView("intake")}
                onOpenCase={openCase}
              />
            )}
            {view === "intake" && (
              <IntakeWizard
                onBack={() => setView("dashboard")}
                onComplete={handleNewCaseComplete}
              />
            )}
            {view === "detail" && activeCase && (
              <CaseDetail
                key={activeCase.id}
                denial={activeCase}
                onBack={() => setView("dashboard")}
                onUpdate={handleCaseUpdate}
              />
            )}
            {view === "rights" && <RightsGuide />}
          </div>
        </div>
      </div>
    </div>
  );
}
