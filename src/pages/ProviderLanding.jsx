import { useState } from "react";

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

export default function ProviderLanding({ navigate }) {
  const [form, setForm]     = useState({ name: "", email: "" });
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
      setStatus(res.ok ? "done" : "error");
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
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: "#0F172A" }}>
          Appeal<span style={{ color: "#10b981" }}>TheDenial</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => navigate("/patients")}
            className="mob-hide"
            style={{
              background: "transparent", border: "1px solid #E2E8F0",
              color: "#64748B", borderRadius: 8, padding: "8px 16px",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.color = "#0F172A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
          >
            For patients
          </button>
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
        style={{
          maxWidth: 600, margin: "0 auto", padding: "72px 24px 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#10b9811a", color: "#10b981",
            border: "1px solid #10b9813a",
            borderRadius: 100, padding: "5px 16px",
            fontSize: 12, fontWeight: 600, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 24,
          }}
        >
          For healthcare providers
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 54px)",
            fontWeight: 700, lineHeight: 1.07,
            letterSpacing: -2, marginBottom: 20,
            color: "#0F172A",
          }}
        >
          We handle every insurance
          <br />
          <span style={{ color: "#10b981" }}>denial your patients receive.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 18px)",
            color: "#64748B", lineHeight: 1.7,
            maxWidth: 540, margin: "0 auto 36px",
          }}
        >
          We take over the appeals process end-to-end — writing, filing, and following up on denied claims on behalf of your patients, so your staff doesn't have to.
        </p>

        {/* Lead form */}
        <div
          style={{
            maxWidth: 440, margin: "0 auto",
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
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4, textAlign: "center" }}>
                Get started in 30 seconds.
              </div>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, textAlign: "center" }}>
                Drop your info and we'll reach out within one business day.
              </p>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  disabled={status === "sending"}
                  style={{
                    background: "#10b981", color: "#fff", border: "none",
                    borderRadius: 10, padding: "16px",
                    fontSize: 16, fontWeight: 600, cursor: status === "sending" ? "wait" : "pointer",
                    fontFamily: "inherit", letterSpacing: -0.2, width: "100%",
                    boxShadow: "0 0 30px #10b98140",
                    opacity: status === "sending" ? 0.7 : 1,
                  }}
                >
                  {status === "sending" ? "Sending…" : "Get in touch →"}
                </button>
                {status === "error" && (
                  <p style={{ fontSize: 13, color: "#f87171", margin: 0, textAlign: "center" }}>
                    Something went wrong — email us at willjhooper@msn.com
                  </p>
                )}
              </form>
            </>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#64748B", marginTop: 16 }}>
          No commitment · We reply within one business day
        </p>
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
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
          Appeal<span style={{ color: "#10b981" }}>TheDenial</span>
        </div>
        <button
          onClick={() => navigate("/patients")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#94A3B8", fontFamily: "inherit",
            textDecoration: "underline",
          }}
        >
          For patients →
        </button>
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
