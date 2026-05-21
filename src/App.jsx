import { useState, useEffect, useCallback } from "react";
import Landing from "./pages/Landing.jsx";
import Submit from "./pages/Submit.jsx";
import Success from "./pages/Success.jsx";
import Status from "./pages/Status.jsx";
import Admin from "./pages/Admin.jsx";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: #090D18;
    color: #EFF6FF;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #1a2640; border-radius: 4px; }

  input, textarea, select {
    background: #0a1220;
    border: 1px solid #1a2640;
    color: #EFF6FF;
    font-family: 'DM Sans', sans-serif;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
    outline: none;
    width: 100%;
    transition: border-color 0.2s;
  }
  input:focus, textarea:focus, select:focus { border-color: #3B82F6; }
  textarea { resize: vertical; min-height: 80px; }
  select option { background: #0f1827; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeIn 0.22s ease both; }
`;

// ── Simple path-based router ──────────────────────────────────────────────────
function useRouter() {
  const [loc, setLoc] = useState({ path: window.location.pathname, search: window.location.search });

  useEffect(() => {
    const sync = () => setLoc({ path: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to);
    const [p, q] = to.split("?");
    setLoc({ path: p, search: q ? "?" + q : "" });
  }, []);

  return { path: loc.path, params: new URLSearchParams(loc.search), navigate };
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { path, params, navigate } = useRouter();

  const page = path.startsWith("/admin")  ? "admin"
             : path === "/submit"         ? "submit"
             : path === "/success"        ? "success"
             : path === "/status"         ? "status"
             :                             "landing";

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="fade-in" key={page}>
        {page === "landing"  && <Landing  navigate={navigate} />}
        {page === "submit"   && <Submit   navigate={navigate} />}
        {page === "success"  && <Success  navigate={navigate} email={params.get("email")} />}
        {page === "status"   && <Status   navigate={navigate} email={params.get("email")} />}
        {page === "admin"    && <Admin    navigate={navigate} />}
      </div>
    </>
  );
}
