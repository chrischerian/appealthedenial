const pptxgen = require("pptxgenjs");

// ── Palette ───────────────────────────────────────────────────────────────────
const BG    = "090D18";
const CARD  = "0F1827";
const BORD  = "1A2640";
const BLUE  = "3B82F6";
const WHITE = "EFF6FF";
const MUTED = "6B7280";
const DIM   = "4B5563";
const LIGHT = "D1D5DB";
const GREEN = "10B981";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" x 5.625"

// ── Helpers ───────────────────────────────────────────────────────────────────
function addBg(slide) {
  slide.background = { color: BG };
}
function label(slide, text, y = 0.22) {
  slide.addText(text, {
    x: 0.5, y, w: 9, h: 0.25,
    fontSize: 10, fontFace: "Calibri", bold: true,
    color: BLUE, charSpacing: 3, align: "left", margin: 0,
  });
}
function title(slide, text, y = 0.55) {
  slide.addText(text, {
    x: 0.5, y, w: 9, h: 0.7,
    fontSize: 28, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  });
}
function divider(slide, y = 1.38) {
  slide.addShape(pres.shapes.LINE, {
    x: 0.5, y, w: 9, h: 0,
    line: { color: BORD, width: 1 },
  });
}
function card(slide, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: CARD },
    line: { color: BORD, width: 1 },
  });
}
function blueBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.07, h: 5.625,
    fill: { color: BLUE }, line: { color: BLUE, width: 0 },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — TITLE
// ─────────────────────────────────────────────────────────────────────────────
const s1 = pres.addSlide();
addBg(s1);
blueBar(s1);

s1.addText("CoverFight", {
  x: 0.6, y: 1.4, w: 9, h: 1.2,
  fontSize: 72, fontFace: "Calibri", bold: true,
  color: WHITE, align: "left", margin: 0,
});
s1.addText("AI-powered insurance appeal automation", {
  x: 0.6, y: 2.75, w: 9, h: 0.5,
  fontSize: 20, fontFace: "Calibri",
  color: BLUE, align: "left", margin: 0,
});
s1.addText("Your insurance said no. We make them reconsider.", {
  x: 0.6, y: 3.45, w: 8, h: 0.4,
  fontSize: 14, fontFace: "Calibri", italic: true,
  color: MUTED, align: "left", margin: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────
const s2 = pres.addSlide();
addBg(s2);
label(s2, "THE PROBLEM");
title(s2, "The system is designed for you to give up");
divider(s2);

s2.addText([
  { text: "45 million insurance claims denied every year in the US",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
  { text: "Only 0.1% of patients ever file a formal appeal",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
  { text: "Of those who do appeal, 40–68% win — depending on denial type",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
  { text: "Most patients don’t appeal because they don’t know how, don’t have time, or assume it won’t work",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
  { text: "Insurers count on this. Denials are a profit mechanism, not a clinical judgment.",
    options: { bullet: true } },
], {
  x: 0.5, y: 1.5, w: 6.1, h: 3.7,
  fontSize: 13, fontFace: "Calibri", color: LIGHT, align: "left",
});

// Stat callout right
card(s2, 7.05, 1.55, 2.65, 2.6);
s2.addText("$300B", {
  x: 7.05, y: 1.85, w: 2.65, h: 0.9,
  fontSize: 44, fontFace: "Calibri", bold: true,
  color: BLUE, align: "center", margin: 0,
});
s2.addText("in denied claims\nannually", {
  x: 7.05, y: 2.8, w: 2.65, h: 0.8,
  fontSize: 13, fontFace: "Calibri",
  color: MUTED, align: "center", margin: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — THE INSIGHT
// ─────────────────────────────────────────────────────────────────────────────
const s3 = pres.addSlide();
addBg(s3);
label(s3, "THE INSIGHT");
title(s3, "The appeal letter is the entire lever");
divider(s3);

// Left blue accent
s3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 1.55, w: 0.05, h: 3.4,
  fill: { color: BLUE }, line: { color: BLUE, width: 0 },
});

s3.addText(
  "A formal written appeal citing applicable federal law — ERISA, the ACA, the No Surprises Act — forces insurers into a defined legal process. They must respond. They must assign a qualified reviewer. They cannot simply ignore it.\n\nMost patients never send one.\n\nWe send one for every single case, automatically, within 24 hours.",
  {
    x: 0.75, y: 1.6, w: 8.7, h: 3.5,
    fontSize: 17, fontFace: "Calibri",
    color: LIGHT, align: "left", lineSpacingMultiple: 1.45, margin: 0,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — THE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
const s4 = pres.addSlide();
addBg(s4);
label(s4, "THE PRODUCT");
title(s4, "From denial to filed appeal in under 3 minutes");
divider(s4);

const steps = [
  { n: "01", title: "Patient submits",
    desc: "Fill out one form. Paste the denial reason. Upload the letter if available. Done." },
  { n: "02", title: "AI analyzes and writes",
    desc: "We classify the denial, identify the strongest legal arguments, and draft a formal appeal letter tailored to the specific case." },
  { n: "03", title: "We file it",
    desc: "With authorization, we send the appeal via certified mail or fax directly to the insurer. Patient tracks status by email." },
];
steps.forEach((s, i) => {
  const x = 0.4 + i * 3.12;
  card(s4, x, 1.55, 2.95, 3.6);
  s4.addText(s.n, {
    x: x + 0.22, y: 1.75, w: 2.5, h: 0.3,
    fontSize: 11, fontFace: "Calibri", bold: true, charSpacing: 2,
    color: BLUE, align: "left", margin: 0,
  });
  s4.addText(s.title, {
    x: x + 0.22, y: 2.12, w: 2.5, h: 0.5,
    fontSize: 15, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  });
  s4.addText(s.desc, {
    x: x + 0.22, y: 2.72, w: 2.5, h: 2.2,
    fontSize: 12, fontFace: "Calibri",
    color: MUTED, align: "left", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — TWO MARKETS
// ─────────────────────────────────────────────────────────────────────────────
const s5 = pres.addSlide();
addBg(s5);
label(s5, "WHO WE SERVE");
title(s5, "Two markets, one pipeline");
divider(s5);

// B2C card
card(s5, 0.4, 1.55, 4.3, 3.7);
s5.addText("Patients  (B2C)", {
  x: 0.65, y: 1.72, w: 3.85, h: 0.38,
  fontSize: 15, fontFace: "Calibri", bold: true,
  color: BLUE, align: "left", margin: 0,
});
s5.addText([
  { text: "Submit directly via coverfight.com", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "No win, no fee — $99 flat only when appeal is approved", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "Card pre-authorized at submission, charged only on reversal", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "Zero friction: no account, no lawyer, no paperwork", options: { bullet: true } },
], {
  x: 0.65, y: 2.18, w: 3.85, h: 2.8,
  fontSize: 12, fontFace: "Calibri", color: LIGHT, align: "left",
});

// B2B card
card(s5, 5.1, 1.55, 4.4, 3.7);
s5.addText("Medical Practices  (B2B)", {
  x: 5.35, y: 1.72, w: 3.9, h: 0.38,
  fontSize: 15, fontFace: "Calibri", bold: true,
  color: BLUE, align: "left", margin: 0,
});
s5.addText([
  { text: "Practices forward denied claims to us", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "We handle everything — analysis, letter, filing, tracking", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "Billed per case ($150–300) or % of recovered revenue (5–10%)", options: { bullet: true, breakLine: true, paraSpaceAfter: 7 } },
  { text: "No new software for staff. We take it off their plate entirely.", options: { bullet: true } },
], {
  x: 5.35, y: 2.18, w: 3.9, h: 2.8,
  fontSize: 12, fontFace: "Calibri", color: LIGHT, align: "left",
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — EMPLOYER BENEFIT
// ─────────────────────────────────────────────────────────────────────────────
const s6 = pres.addSlide();
addBg(s6);
label(s6, "THE THIRD CHANNEL");
title(s6, "Employer benefits  (B2B2C)");
divider(s6);

s6.addText(
  "Employers pay a per-employee-per-month (PEPM) fee to offer CoverFight as a workplace benefit — the same way they offer Teladoc or EAP programs. Employees access the patient flow directly. HR never touches a case. One contract covers thousands of potential users.",
  {
    x: 0.5, y: 1.55, w: 9, h: 1.0,
    fontSize: 14, fontFace: "Calibri",
    color: LIGHT, lineSpacingMultiple: 1.4, align: "left", margin: 0,
  }
);

const empStats = [
  { val: "160M",      sub: "Americans with employer-sponsored health insurance" },
  { val: "111%",      sub: "Increase in average deductible over the last decade" },
  { val: "1 contract", sub: "Can cover 500 to 5,000 employees" },
];
empStats.forEach((e, i) => {
  const x = 0.4 + i * 3.12;
  card(s6, x, 2.8, 2.95, 2.4);
  s6.addText(e.val, {
    x: x + 0.15, y: 3.0, w: 2.65, h: 0.9,
    fontSize: 36, fontFace: "Calibri", bold: true,
    color: BLUE, align: "center", margin: 0,
  });
  s6.addText(e.sub, {
    x: x + 0.15, y: 3.95, w: 2.65, h: 1.0,
    fontSize: 11, fontFace: "Calibri",
    color: MUTED, align: "center", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — ECONOMICS
// ─────────────────────────────────────────────────────────────────────────────
const s7 = pres.addSlide();
addBg(s7);
label(s7, "BUSINESS MODEL");
title(s7, "Unit economics that work at every tier");
divider(s7);

const tbl = [
  [
    { text: "Channel",         options: { bold: true, color: WHITE, fill: { color: CARD } } },
    { text: "Revenue per unit", options: { bold: true, color: WHITE, fill: { color: CARD } } },
    { text: "Volume potential", options: { bold: true, color: WHITE, fill: { color: CARD } } },
    { text: "Margin",           options: { bold: true, color: WHITE, fill: { color: CARD } } },
  ],
  [
    { text: "B2C Patient",     options: { color: LIGHT, fill: { color: BG } } },
    { text: "$99 per win",     options: { color: BLUE, bold: true, fill: { color: BG } } },
    { text: "Millions of annual denials", options: { color: LIGHT, fill: { color: BG } } },
    { text: "~85%",            options: { color: GREEN, bold: true, fill: { color: BG } } },
  ],
  [
    { text: "B2B Practice",    options: { color: LIGHT, fill: { color: CARD } } },
    { text: "$150–300 per case", options: { color: BLUE, bold: true, fill: { color: CARD } } },
    { text: "200+ cases/month per mid-size practice", options: { color: LIGHT, fill: { color: CARD } } },
    { text: "~75%",            options: { color: GREEN, bold: true, fill: { color: CARD } } },
  ],
  [
    { text: "B2B2C Employer",  options: { color: LIGHT, fill: { color: BG } } },
    { text: "$2–5 PEPM",  options: { color: BLUE, bold: true, fill: { color: BG } } },
    { text: "1 contract = 500–5,000 employees", options: { color: LIGHT, fill: { color: BG } } },
    { text: "~90%",            options: { color: GREEN, bold: true, fill: { color: BG } } },
  ],
];
s7.addTable(tbl, {
  x: 0.5, y: 1.5, w: 9.0,
  border: { pt: 1, color: BORD },
  fontSize: 13, fontFace: "Calibri",
  colW: [1.8, 1.85, 3.35, 0.9],
  rowH: 0.5,
  align: "left",
  margin: [6, 10, 6, 10],
});

// Callout
card(s7, 0.5, 3.75, 9.0, 1.5);
s7.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 3.75, w: 0.06, h: 1.5,
  fill: { color: BLUE }, line: { color: BLUE, width: 0 },
});
s7.addText(
  "A single regional hospital system generates $600K–$1.2M in annual revenue at $250/case",
  {
    x: 0.75, y: 3.9, w: 8.5, h: 1.1,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — WHY NOW
// ─────────────────────────────────────────────────────────────────────────────
const s8 = pres.addSlide();
addBg(s8);
label(s8, "TIMING");
title(s8, "Three forces converging right now");
divider(s8);

const why = [
  { n: "1", head: "AI maturity",
    body: "Large language models can now read a denial letter, classify it, identify applicable law, and draft a compliant formal appeal — in seconds. This was not possible three years ago." },
  { n: "2", head: "Regulatory tailwind",
    body: "The ACA, ERISA, and the No Surprises Act (2022) have created a dense framework of patient rights that most patients don’t know they have. We put those rights to work on their behalf." },
  { n: "3", head: "Public anger",
    body: "Insurance denial has become a mainstream political and cultural issue. Patients are looking for tools. Employers are looking for benefits. Providers are looking for relief." },
];
why.forEach((w, i) => {
  const y = 1.55 + i * 1.25;
  // Number box
  s8.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y, w: 0.42, h: 0.42,
    fill: { color: CARD }, line: { color: BORD, width: 1 },
  });
  s8.addText(w.n, {
    x: 0.5, y, w: 0.42, h: 0.42,
    fontSize: 14, fontFace: "Calibri", bold: true,
    color: BLUE, align: "center", valign: "middle", margin: 0,
  });
  s8.addText(w.head, {
    x: 1.1, y, w: 8.4, h: 0.35,
    fontSize: 15, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  });
  s8.addText(w.body, {
    x: 1.1, y: y + 0.38, w: 8.4, h: 0.75,
    fontSize: 12, fontFace: "Calibri",
    color: MUTED, align: "left", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — THE MOAT
// ─────────────────────────────────────────────────────────────────────────────
const s9 = pres.addSlide();
addBg(s9);
label(s9, "DEFENSIBILITY");
title(s9, "What makes this defensible");
divider(s9);

const moat = [
  { head: "Outcome data",
    body: "Every case processed trains our classification and win-probability models. The more cases we handle, the better our predictions and strategies become." },
  { head: "Denial library",
    body: "We build a proprietary database of denial language, insurer patterns, and winning appeal arguments. Impossible to replicate without volume." },
  { head: "Trust infrastructure",
    body: "Certified mail filing, HIPAA-compliant handling, legal audit trails. This is table stakes that takes time to build properly." },
  { head: "Network effects",
    body: "Employer and practice relationships compound. One hospital CFO referral unlocks 10 departments." },
];
moat.forEach((m, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = 0.4 + col * 4.75;
  const y = 1.55 + row * 2.0;
  card(s9, x, y, 4.45, 1.8);
  s9.addText(m.head, {
    x: x + 0.25, y: y + 0.2, w: 4.0, h: 0.35,
    fontSize: 14, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  });
  s9.addText(m.body, {
    x: x + 0.25, y: y + 0.62, w: 4.0, h: 1.0,
    fontSize: 12, fontFace: "Calibri",
    color: MUTED, align: "left", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — TRACTION
// ─────────────────────────────────────────────────────────────────────────────
const s10 = pres.addSlide();
addBg(s10);
label(s10, "TRACTION");
title(s10, "What we’ve built");
divider(s10);

s10.addText([
  { text: "Fully functional AI pipeline: submission → classification → analysis → letter generation → filing",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
  { text: "8 denial categories covered with category-specific legal strategies",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
  { text: "Admin dashboard for case management, AI chat, and external review generation",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
  { text: "Certified mail (Lob) and fax (Twilio) delivery integrations built",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
  { text: "Every fact in the appeal letter is traceable to patient-submitted data",
    options: { bullet: true, breakLine: true, paraSpaceAfter: 12 } },
  { text: "Currently in closed testing",
    options: { bullet: true } },
], {
  x: 0.5, y: 1.55, w: 9.0, h: 3.9,
  fontSize: 15, fontFace: "Calibri", color: LIGHT, align: "left",
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 11 — GO TO MARKET
// ─────────────────────────────────────────────────────────────────────────────
const s11 = pres.addSlide();
addBg(s11);
label(s11, "GO TO MARKET");
title(s11, "How we grow");
divider(s11);

const phases = [
  { range: "0–6 months",   head: "Prove it with patients",
    body: "Drive B2C volume through SEO, social, and word of mouth. Build the case outcome dataset.",
    target: "Target: 500 cases" },
  { range: "6–18 months",  head: "Land practices",
    body: "Sign 10 medical practices as managed service clients. One billing manager referral = practice-wide adoption.",
    target: "Target: $50K MRR" },
  { range: "18–36 months", head: "Employer channel",
    body: "Partner with 3–5 benefits brokers who distribute to employer clients. One broker = hundreds of employer groups.",
    target: "Target: $500K MRR" },
];
phases.forEach((p, i) => {
  const x = 0.4 + i * 3.12;
  card(s11, x, 1.55, 2.95, 3.7);
  s11.addText(p.range, {
    x: x + 0.22, y: 1.72, w: 2.5, h: 0.28,
    fontSize: 10, fontFace: "Calibri", bold: true, charSpacing: 1,
    color: BLUE, align: "left", margin: 0,
  });
  s11.addText(p.head, {
    x: x + 0.22, y: 2.05, w: 2.5, h: 0.5,
    fontSize: 14, fontFace: "Calibri", bold: true,
    color: WHITE, align: "left", margin: 0,
  });
  s11.addText(p.body, {
    x: x + 0.22, y: 2.62, w: 2.5, h: 1.85,
    fontSize: 12, fontFace: "Calibri",
    color: MUTED, align: "left", margin: 0,
  });
  // Target badge
  s11.addShape(pres.shapes.RECTANGLE, {
    x: x + 0.22, y: 4.62, w: 2.5, h: 0.38,
    fill: { color: CARD }, line: { color: BLUE, width: 1 },
  });
  s11.addText(p.target, {
    x: x + 0.22, y: 4.62, w: 2.5, h: 0.38,
    fontSize: 11, fontFace: "Calibri", bold: true,
    color: BLUE, align: "center", valign: "middle", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 12 — THE ASK
// ─────────────────────────────────────────────────────────────────────────────
const s12 = pres.addSlide();
addBg(s12);
label(s12, "THE ASK");
title(s12, "What we’re raising");
divider(s12);

// Left: raise amount
card(s12, 0.4, 1.55, 3.6, 3.7);
s12.addText("$750K", {
  x: 0.4, y: 2.05, w: 3.6, h: 1.1,
  fontSize: 56, fontFace: "Calibri", bold: true,
  color: BLUE, align: "center", margin: 0,
});
s12.addText("Seed Round", {
  x: 0.4, y: 3.2, w: 3.6, h: 0.4,
  fontSize: 16, fontFace: "Calibri",
  color: MUTED, align: "center", margin: 0,
});
s12.addText("Looking for investors with healthcare,\ninsurtech, or B2B SaaS experience\nwho can open doors to hospital\nsystems and benefits brokers.", {
  x: 0.6, y: 3.75, w: 3.2, h: 1.25,
  fontSize: 11, fontFace: "Calibri",
  color: DIM, align: "center", margin: 0,
});

// Right: use of funds
card(s12, 4.35, 1.55, 5.25, 3.7);
s12.addText("Use of funds", {
  x: 4.6, y: 1.73, w: 4.75, h: 0.35,
  fontSize: 13, fontFace: "Calibri", bold: true,
  color: WHITE, align: "left", margin: 0,
});

const funds = [
  { pct: "40%", desc: "Engineering — payments, multi-tenant B2B portal, EHR integrations" },
  { pct: "30%", desc: "Sales — first B2B practice and employer contracts" },
  { pct: "20%", desc: "Legal & compliance — HIPAA, state regulatory review" },
  { pct: "10%", desc: "Operations" },
];
funds.forEach((f, i) => {
  const y = 2.2 + i * 0.74;
  s12.addText(f.pct, {
    x: 4.6, y, w: 0.7, h: 0.38,
    fontSize: 16, fontFace: "Calibri", bold: true,
    color: BLUE, align: "left", margin: 0,
  });
  s12.addText(f.desc, {
    x: 5.35, y, w: 4.0, h: 0.55,
    fontSize: 11, fontFace: "Calibri",
    color: LIGHT, align: "left", margin: 0,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 13 — CLOSING
// ─────────────────────────────────────────────────────────────────────────────
const s13 = pres.addSlide();
addBg(s13);
blueBar(s13);

s13.addText("Most people never appeal.", {
  x: 0.65, y: 1.1, w: 9, h: 0.85,
  fontSize: 42, fontFace: "Calibri", bold: true,
  color: WHITE, align: "left", margin: 0,
});
s13.addText("The ones who do, often win.", {
  x: 0.65, y: 1.95, w: 9, h: 0.85,
  fontSize: 42, fontFace: "Calibri", bold: true,
  color: BLUE, align: "left", margin: 0,
});
s13.addText("We make sure everyone does.", {
  x: 0.65, y: 3.05, w: 9, h: 0.5,
  fontSize: 21, fontFace: "Calibri", italic: true,
  color: MUTED, align: "left", margin: 0,
});
s13.addText("[founder name]  |  [email]  |  coverfight.com", {
  x: 0.65, y: 4.65, w: 9, h: 0.35,
  fontSize: 12, fontFace: "Calibri",
  color: DIM, align: "left", margin: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "C:\\Users\\willj\\coverfight\\CoverFight-Pitch.pptx" });
console.log("Done: CoverFight-Pitch.pptx");
