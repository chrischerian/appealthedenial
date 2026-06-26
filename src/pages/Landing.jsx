import { useState } from "react";
import { Logo } from "../components/Logo.jsx";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell us about your denial",
    desc: "Fill out our 2-minute form. Paste the reason from your denial letter, upload it if you have it, and tell us what was denied.",
    color: "#059669",
  },
  {
    step: "02",
    title: "We analyze and write your appeal",
    desc: "Our AI reads your denial, identifies the strongest arguments, and drafts a formal appeal letter tailored to your case.",
    color: "#059669",
  },
  {
    step: "03",
    title: "We file it for you",
    desc: "With your authorization, we send your appeal directly to the insurer via certified mail or fax. You don't touch a thing.",
    color: "#059669",
  },
];

const DENIAL_TYPES = [
  { label: "Medical Necessity",  desc: "Most common — we challenge the denial on clinical grounds." },
  { label: "Prior Authorization", desc: "We request retroactive authorization and argue urgency." },
  { label: "Experimental",       desc: "We demand their criteria and trigger your right to external review." },
  { label: "Out of Network",     desc: "We invoke the No Surprises Act to force in-network rates." },
  { label: "Plan Exclusion",     desc: "We find the federal benefits that override their exclusion." },
  { label: "Billing Error",      desc: "We notify your provider and get a corrected claim filed." },
  { label: "Late Filing",        desc: "We argue the patient bears no responsibility for provider errors." },
  { label: "Eligibility",        desc: "We challenge administrative errors and demand enrollment verification." },
];

const FAQ = [
  {
    q: "Is this actually free?",
    a: "Yes. We're in early access and everything is free right now. No credit card, no account, no hidden fees.",
  },
  {
    q: "Is AppealTheDenial a law firm?",
    a: "No. We're not a law firm and we don't provide legal advice. We help you write and file formal appeal letters based on your rights under federal law. For complex cases, we recommend consulting an attorney.",
  },
  {
    q: "Does this really work?",
    a: "Internal appeals reverse 40-68% of denials depending on the type. A formal letter citing applicable law and demanding reviewer credentials changes the dynamic significantly — insurers know an informed patient is harder to dismiss.",
  },
  {
    q: "What if my insurer ignores the appeal?",
    a: "Under the ACA, they're legally required to respond within 30-60 days. If they don't — or if your internal appeal is denied — you have a federal right to independent external review. We'll help you with that too.",
  },
  {
    q: "Do I need a doctor's involvement?",
    a: "Not for submitting the appeal. If the insurer requests a peer-to-peer review, we'll provide a brief for your doctor so that conversation takes 5 minutes, not 5 hours.",
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid #E2E8F0",
        paddingBottom: open ? 16 : 0,
        marginBottom: 0,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          padding: "18px 0", cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: 16,
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "#0F172A" }}>{q}</span>
        <span style={{ color: "#94A3B8", fontSize: 20, lineHeight: 1, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.75, paddingBottom: 4 }}>{a}</p>
      )}
    </div>
  );
}

export default function Landing({ navigate }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 40px", borderBottom: "1px solid #E2E8F0",
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
        }}
      >
        <Logo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => navigate("/status")}
            style={{
              background: "transparent", border: "1px solid #E2E8F0",
              color: "#64748B", borderRadius: 8, padding: "8px 16px",
              fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#059669"; e.currentTarget.style.color = "#0F172A"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
          >
            Check status
          </button>
          <button
            onClick={() => navigate("/submit")}
            style={{
              background: "#059669", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 18px",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Fight My Denial →
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 760, margin: "0 auto", padding: "100px 24px 80px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(38px, 6vw, 68px)",
            fontWeight: 700, lineHeight: 1.06,
            letterSpacing: -2, marginBottom: 24,
            color: "#0F172A",
          }}
        >
          Your insurance said no.
          <br />
          <span style={{ color: "#059669" }}>We make them reconsider.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            color: "#64748B", lineHeight: 1.7,
            maxWidth: 500, margin: "0 auto 44px",
          }}
        >
          Fill out one form. We analyze your denial, write a formal appeal letter, and file it with your insurer. You don't lift a finger.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/submit")}
            style={{
              background: "#059669", color: "#fff", border: "none",
              borderRadius: 12, padding: "16px 36px",
              fontSize: 16, fontWeight: 600, cursor: "pointer",
              letterSpacing: -0.2, fontFamily: "inherit",
              transition: "background 0.15s, transform 0.1s",
              boxShadow: "0 0 30px #05966940",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#047857"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.transform = "none"; }}
          >
            Fight My Denial →
          </button>
          <button
            onClick={() => navigate("/status")}
            style={{
              background: "transparent", color: "#64748B",
              border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 28px",
              fontSize: 16, cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#059669"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
          >
            Check my case status
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#CBD5E1", marginTop: 18 }}>
          Free &nbsp;·&nbsp; No account needed &nbsp;·&nbsp; Not legal advice
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#059669", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: -1, color: "#0F172A" }}>
            From denial to appeal in minutes
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              style={{
                background: "#FFFFFF", border: "1px solid #E2E8F0",
                borderRadius: 16, padding: "28px 24px",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 2,
                  color: item.color, marginBottom: 16, textTransform: "uppercase",
                }}
              >
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
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#059669", marginBottom: 12 }}>
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
                    background: "#0596691a",
                    color: "#059669",
                    border: "1px solid #0596693a",
                    borderRadius: 6, padding: "3px 10px",
                    fontSize: 12, fontWeight: 500,
                    marginBottom: 10,
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

      {/* ── Trust section ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, letterSpacing: -0.5, color: "#0F172A", marginBottom: 8 }}>
            Built to win, built to protect you
          </h2>
          <p style={{ fontSize: 15, color: "#64748B" }}>Every letter is reviewed for accuracy before it goes out.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { title: "Only your facts", desc: "Every detail in your letter comes directly from what you submitted. Nothing is assumed or added." },
            { title: "Federal law citations", desc: "Your letter cites the exact statutes that protect you — ERISA, ACA, No Surprises Act." },
            { title: "Certified mail filing", desc: "We file via USPS Certified Mail or fax, creating a legal record of your submission date." },
            { title: "External review path", desc: "If your internal appeal fails, we'll generate an independent external review request." },
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

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#059669", marginBottom: 12 }}>
              FAQ
            </div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, letterSpacing: -0.5, color: "#0F172A" }}>
              Common questions
            </h2>
          </div>
          <div>
            {FAQ.map((item) => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, letterSpacing: -1.5, color: "#0F172A", marginBottom: 16 }}>
          Don't let them win by default.
        </h2>
        <p style={{ fontSize: 17, color: "#64748B", lineHeight: 1.65, marginBottom: 40, maxWidth: 420, margin: "0 auto 40px" }}>
          Most people never appeal. The ones who do, often win. It takes 2 minutes to start.
        </p>
        <button
          onClick={() => navigate("/submit")}
          style={{
            background: "#059669", color: "#fff", border: "none",
            borderRadius: 12, padding: "18px 44px",
            fontSize: 17, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: -0.2,
            boxShadow: "0 0 40px #05966950",
            transition: "background 0.15s, transform 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#047857"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#059669"; e.currentTarget.style.transform = "none"; }}
        >
          Fight My Denial →
        </button>
        <p style={{ fontSize: 13, color: "#CBD5E1", marginTop: 16 }}>Free · No account · Not legal advice</p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #E2E8F0", padding: "28px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
          Appeal<span style={{ color: "#059669" }}>TheDenial</span>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>
          Not a law firm. Not legal advice. Results vary.
        </div>
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
