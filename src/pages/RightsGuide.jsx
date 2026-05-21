import { Btn, Badge, Card, SectionLabel } from "../components/ui.jsx";

const RIGHTS = [
  {
    title: "Right to Appeal",
    color: "#3B82F6",
    law: "ACA § 2719",
    body: "Under the ACA, you have the right to appeal any denial. Internal appeals must be resolved in 30 days (urgent care) or 60 days (standard). The insurer must provide a written explanation.",
  },
  {
    title: "Independent External Review",
    color: "#8B5CF6",
    law: "ACA External Review",
    body: "If your internal appeal fails, request an independent external review from a federally-accredited organization. The reviewer's decision is legally binding on your insurer.",
  },
  {
    title: "Reviewer Credentials",
    color: "#F59E0B",
    law: "HIPAA § 164",
    body: "You are legally entitled to the full names and board certifications of every person who reviewed and denied your claim. Demand this in writing — reviewers must be in the same specialty.",
  },
  {
    title: "ERISA Protections",
    color: "#10B981",
    law: "ERISA § 502(a)",
    body: "If your coverage is through an employer, ERISA gives you the right to all plan documents, a written denial explanation, and the ability to sue in federal court if your appeal is wrongly denied.",
  },
  {
    title: "Peer-to-Peer Review",
    color: "#3B82F6",
    law: "State regulations vary",
    body: "Your treating physician can request a direct call with the insurance medical director who denied the claim. This single conversation reverses a significant percentage of denials.",
  },
  {
    title: "State Commissioner",
    color: "#EF4444",
    law: "State insurance law",
    body: "File a complaint with your state's insurance commissioner. This opens a formal regulatory investigation and creates significant pressure on the insurer to reconsider.",
  },
];

const SCRIPTS = [
  {
    title: "Opening call — request reviewer credentials",
    text: `"I am calling to formally initiate an appeal for claim #[CLAIM NUMBER]. I am requesting the full legal names, board certifications, and medical specialties of every physician and reviewer who denied this claim. I am legally entitled to this information. Please also connect me with your HIPAA Compliance and Privacy Officer."`,
  },
  {
    title: "Requesting peer-to-peer review",
    text: `"I need to arrange a peer-to-peer review between my treating physician, [DOCTOR NAME], and the medical director or physician reviewer who denied this claim. Please provide a direct phone number and confirm the name and specialty of the reviewing physician. My doctor is available this week."`,
  },
  {
    title: "Invoking external review rights",
    text: `"My internal appeal has been exhausted. I am now formally invoking my federal right to an independent external review under the Affordable Care Act, Section 2719. Please provide written confirmation of this request within one business day, along with the name of the accredited independent review organization you will be using."`,
  },
];

export default function RightsGuide() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Know Your Rights</h2>
        <p style={{ color: "#6B7280", fontSize: 14 }}>
          Federal and state laws that protect you from wrongful insurance denials.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
        {RIGHTS.map((r) => (
          <Card key={r.title}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 500, color: "#EFF6FF" }}>{r.title}</div>
              <Badge color={r.color}>{r.law}</Badge>
            </div>
            <p style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.7 }}>{r.body}</p>
          </Card>
        ))}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: "#EFF6FF" }}>Call Scripts</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SCRIPTS.map((s) => (
          <Card key={s.title}>
            <SectionLabel>{s.title}</SectionLabel>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: "#93c5fd",
                lineHeight: 1.8,
                background: "#070c18",
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              {s.text}
            </div>
            <Btn
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(s.text)}
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              Copy
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}
