import { useState } from "react";
import { Logo } from "../components/Logo.jsx";

const DENIAL_TYPES = [
  { label: "Medical Necessity",   desc: "We challenge the denial on clinical grounds with a formal letter citing applicable standards of care." },
  { label: "Prior Authorization", desc: "We request retroactive authorization and argue medical urgency on the patient's behalf." },
  { label: "Experimental",        desc: "We demand the insurer's coverage criteria and trigger the patient's right to independent external review." },
  { label: "Out of Network",      desc: "We invoke the No Surprises Act and argue for in-network rates." },
  { label: "Plan Exclusion",      desc: "We identify federal benefit mandates that override the plan's stated exclusion." },
  { label: "Billing Error",       desc: "We coordinate with your billing team and get a corrected claim filed." },
  { label: "Late Filing",         desc: "We argue the patient bears no responsibility for administrative errors on the provider side." },
  { label: "Eligibility",         desc: "We challenge enrollment discrepancies and demand verification from the insurer." },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "You forward us the denial",
    desc: "Share the denial notice and any supporting documentation. We handle everything from that point.",
  },
  {
    step: "02",
    title: "We build and file the appeal",
    desc: "We analyze the denial, identify the strongest legal and clinical arguments, write the formal letter, and file it directly with the insurer.",
  },
  {
    step: "03",
    title: "We follow it through",
    desc: "We track the response, escalate to external review if needed, and keep the patient informed at every step.",
  },
];

const PLANS = [
  { value: "contingency",  title: "Free unless we win", desc: "Pay nothing upfront. We take a percentage only when we recover the claim." },
  { value: "flat_monthly", title: "Flat monthly",       desc: "One predictable monthly fee, unlimited appeals." },
  { value: "per_appeal",   title: "Pay per appeal",     desc: "A flat price for each appeal we file." },
];

export default function ProviderLanding({ navigate }) {
  const [form, setForm]     = useState({ name: "", email: "", selectedPlan: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("https://formsubmit.co/ajax/will@solognecourtholdings.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name:  form.name,
          email: form.email,
          _subject: "New lead from AppealTheDenial.com (providers)",
          _captcha: "false",
        }),
      });
      if (res.ok) {
        if (window.fbq) window.fbq("trackCustom", "LeadSubmitted", { plan: form.selectedPlan });
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        className="mob-nav"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 40px", borderBottom: "1px solid #E2E8F0",
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
        }}
      >
        <Logo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href="mailto:willjhooper@msn.com"
            style={{
              background: "#10b981", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", textDecoration: "none",
              display: "inline-block",
            }}
          >
            Get in touch →
          </a>
        </div>
      </nav>

      {/* ── Hero (form front-and-center) ─────────────────────────────────────── */}
      <section
        className="mob-hero"
        style={{ maxWidth: 1140, margin: "0 auto", padding: "88px 24px 96px" }}
      >
       <div style={{ display: "flex", flexWrap: "wrap", gap: 56, alignItems: "center", justifyContent: "center" }}>

        {/* Left — copy */}
        <div style={{ flex: "1 1 440px", maxWidth: 600 }}>
          <h1
            style={{
              fontSize: "clamp(40px, 5.4vw, 66px)",
              fontWeight: 700, lineHeight: 1.04,
              letterSpacing: -2.5, marginBottom: 24,
              color: "#0F172A",
            }}
          >
            We handle every insurance{" "}
            <span style={{ color: "#10b981" }}>denial your patients receive.</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(17px, 1.7vw, 21px)",
              color: "#64748B", lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            We take over the entire appeals process. We write, file, and follow up on denied claims for your patients, so your staff doesn't have to.
          </p>
        </div>

        {/* Right — form */}
        <div style={{ flex: "0 1 440px", width: "100%", maxWidth: 440 }}>
        <div
          style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0",
            borderRadius: 18, padding: "28px 24px",
            boxShadow: "0 10px 40px rgba(15,23,42,0.06), 0 2px 8px rgba(15,23,42,0.04)",
            textAlign: "left",
          }}
        >
          {status === "done" ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12, color: "#059669" }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>You're on our list.</div>
              <p style={{ fontSize: 14, color: "#64748B" }}>We'll be in touch within one business day.</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 20, textAlign: "center" }}>
                Get started in 30 seconds.
              </div>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Plan selector — required before submit */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 2 }}>
                    How would you want to pay?
                  </div>
                  {PLANS.map((p) => {
                    const active = form.selectedPlan === p.value;
                    return (
                      <button
                        type="button"
                        key={p.value}
                        onClick={() => {
                          setForm((f) => ({ ...f, selectedPlan: p.value }));
                          if (window.fbq) window.fbq("trackCustom", "PlanSelected", { plan: p.value });
                        }}
                        style={{
                          textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                          background: active ? "#10b9811a" : "#FFFFFF",
                          border: active ? "1.5px solid #10b981" : "1px solid #E2E8F0",
                          borderRadius: 10, padding: "10px 14px",
                          display: "flex", alignItems: "center", gap: 10,
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                          border: active ? "5px solid #10b981" : "2px solid #CBD5E1",
                          background: "#FFFFFF", transition: "border 0.15s",
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{p.title}</span>
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Your name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{
                    background: "#FFFFFF", border: "1px solid #E2E8F0",
                    borderRadius: 10, padding: "14px 16px",
                    fontSize: 15, color: "#0F172A", fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#10b981"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; }}
                />
                <input
                  type="email"
                  placeholder="Work email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={{
                    background: "#FFFFFF", border: "1px solid #E2E8F0",
                    borderRadius: 10, padding: "14px 16px",
                    fontSize: 15, color: "#0F172A", fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#10b981"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; }}
                />
                <button
                  type="submit"
                  disabled={status === "sending" || !form.selectedPlan}
                  style={{
                    background: "#10b981", color: "#fff", border: "none",
                    borderRadius: 10, padding: "16px",
                    fontSize: 16, fontWeight: 600,
                    cursor: (status === "sending" || !form.selectedPlan) ? "not-allowed" : "pointer",
                    fontFamily: "inherit", letterSpacing: -0.2, width: "100%",
                    boxShadow: form.selectedPlan ? "0 0 30px #10b98140" : "none",
                    opacity: (status === "sending" || !form.selectedPlan) ? 0.55 : 1,
                    transition: "opacity 0.15s, box-shadow 0.15s",
                  }}
                >
                  {status === "sending" ? "Sending…" : "Get in touch →"}
                </button>
                {!form.selectedPlan && (
                  <p style={{ fontSize: 12.5, color: "#94A3B8", margin: 0, textAlign: "center" }}>
                    Pick an option above to continue.
                  </p>
                )}
                {status === "error" && (
                  <p style={{ fontSize: 13, color: "#f87171", margin: 0, textAlign: "center" }}>
                    Something went wrong — email us at willjhooper@msn.com
                  </p>
                )}
              </form>
            </>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#64748B", marginTop: 16, textAlign: "center" }}>
          No commitment · We reply within one business day
        </p>
        </div>

       </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="mob-sec" style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#10b981", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: -1, color: "#0F172A" }}>
            You refer it. We handle it.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              style={{
                background: "#FFFFFF", border: "1px solid #E2E8F0",
                borderRadius: 16, padding: "28px 24px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#10b981", marginBottom: 16, textTransform: "uppercase" }}>
                Step {item.step}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#0F172A", marginBottom: 10, lineHeight: 1.3 }}>
                {item.title}
              </div>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Denial types ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div className="mob-sec" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#10b981", marginBottom: 12 }}>
              What we handle
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, letterSpacing: -1, color: "#0F172A" }}>
              Every major denial type, covered
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {DENIAL_TYPES.map((d) => (
              <div
                key={d.label}
                style={{
                  background: "#FFFFFF", border: "1px solid #E2E8F0",
                  borderRadius: 12, padding: "18px 16px",
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    background: "#10b9811a", color: "#10b981",
                    border: "1px solid #10b9813a",
                    borderRadius: 6, padding: "3px 10px",
                    fontSize: 12, fontWeight: 500, marginBottom: 10,
                  }}
                >
                  {d.label}
                </div>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────────── */}
      <section className="mob-sec" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 700, letterSpacing: -0.5, color: "#0F172A", marginBottom: 8 }}>
            What you get
          </h2>
          <p style={{ fontSize: 15, color: "#64748B" }}>Everything needed to fight a denial, handled entirely on our end.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { title: "Formal appeal letters", desc: "Professionally written, citing the specific federal statutes that protect the patient's claim." },
            { title: "Direct filing", desc: "We send the appeal to the insurer via certified mail or fax, creating a legal record." },
            { title: "External review escalation", desc: "If the internal appeal is denied, we escalate to independent external review automatically." },
            { title: "Patient communication", desc: "We keep the patient informed so your staff isn't fielding calls about claim status." },
          ].map((t) => (
            <div
              key={t.title}
              style={{
                background: "#FFFFFF", border: "1px solid #E2E8F0",
                borderRadius: 14, padding: "24px 20px",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>{t.title}</div>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
        <div className="mob-sec" style={{ maxWidth: 700, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, letterSpacing: -1.5, color: "#0F172A", marginBottom: 16 }}>
            Let's talk.
          </h2>
          <p style={{ fontSize: 17, color: "#64748B", lineHeight: 1.65, marginBottom: 40, maxWidth: 420, margin: "0 auto 40px" }}>
            If you're dealing with a high volume of denied claims and want a partner to handle them, reach out and we'll set up a call.
          </p>
          <a
            href="mailto:willjhooper@msn.com"
            className="mob-cta"
            style={{
              display: "inline-block",
              background: "#10b981", color: "#fff",
              borderRadius: 12, padding: "18px 44px",
              fontSize: 17, fontWeight: 600,
              fontFamily: "inherit", letterSpacing: -0.2,
              textDecoration: "none",
              boxShadow: "0 0 40px #10b98150",
            }}
          >
            Get in touch →
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        className="mob-nav"
        style={{
          borderTop: "1px solid #E2E8F0", padding: "28px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}
      >
        <Logo height={32} />
        <a
          href="/admin"
          style={{ fontSize: 11, color: "#94A3B8", textDecoration: "none" }}
          onClick={(e) => { e.preventDefault(); navigate("/admin"); }}
        >
          Admin
        </a>
      </footer>
    </div>
  );
}
