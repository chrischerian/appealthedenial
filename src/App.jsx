import { useState, useEffect, useCallback } from "react";
import "./index.css";
import ProviderLanding from "./pages/ProviderLanding.jsx";
import OutreachLanding from "./pages/OutreachLanding.jsx";
import Landing from "./pages/Landing.jsx";
import Submit from "./pages/Submit.jsx";
import Success from "./pages/Success.jsx";
import Status from "./pages/Status.jsx";
import Admin from "./pages/Admin.jsx";
import UpdateInfo from "./pages/UpdateInfo.jsx";

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
             : path === "/update"         ? "update"
             : path === "/patients"       ? "patients"
             : path === "/hello"          ? "hello"
             :                             "provider";

  return (
    <>
      <div className="fade-in" key={page}>
        {page === "provider"  && <ProviderLanding  navigate={navigate} />}
        {page === "hello"     && <OutreachLanding  navigate={navigate} />}
        {page === "patients"  && <Landing         navigate={navigate} />}
        {page === "submit"    && <Submit          navigate={navigate} />}
        {page === "success"   && <Success         navigate={navigate} email={params.get("email")} />}
        {page === "status"    && <Status          navigate={navigate} email={params.get("email")} />}
        {page === "update"    && <UpdateInfo      navigate={navigate} token={params.get("token")} />}
        {page === "admin"     && <Admin           navigate={navigate} />}
      </div>
    </>
  );
}
