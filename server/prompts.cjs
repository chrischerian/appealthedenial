// ── Vetted legal citations ────────────────────────────────────────────────────
// ONLY these citations may appear in any generated letter. Verified statutes.
const APPROVED_CITATIONS = [
  "29 C.F.R. § 2560.503-1 — ERISA minimum claims and appeals procedure (employer-sponsored plans)",
  "ERISA § 502(a), 29 U.S.C. § 1132(a) — right to enforce plan terms and recover benefits",
  "42 U.S.C. § 300gg-19 (ACA § 2719) — mandatory internal appeals and federal external review rights",
  "45 C.F.R. § 147.136 — ACA internal and external review standards for non-grandfathered plans",
  "42 U.S.C. § 300gg-111 (No Surprises Act) — surprise billing protections, in-network cost-sharing required for out-of-network emergency care",
  "42 U.S.C. § 1395ff — Medicare appeals rights (use ONLY for Medicare denials)",
  "42 C.F.R. § 405.940-960 — Medicare redetermination and appeals procedure (use ONLY for Medicare)",
  "42 C.F.R. § 438.400-438.424 — Medicaid managed care appeal and grievance rights (use ONLY for Medicaid)",
];

const CITATION_LIST = APPROVED_CITATIONS.map((c, i) => `  ${i + 1}. ${c}`).join("\n");

// Injected into EVERY letter prompt — non-negotiable
const ZERO_HALLUCINATION_BLOCK = `
⛔ ABSOLUTE ZERO-HALLUCINATION REQUIREMENT:
Every single statement in this letter must be traceable to a field in CONFIRMED INFORMATION.
Violations that will make this letter legally dangerous and unusable:
  - Citing any medical study, clinical guideline, journal, or statistic not listed above
  - Mentioning ANY prior treatment, medication, or alternative therapy not explicitly listed above
  - Describing the severity or progression of the patient's condition beyond what was stated
  - Adding ANY procedure codes, ICD codes, diagnosis codes, or CPT codes not in the data above
  - Naming any doctor, specialist, facility, or reviewer not listed above
  - Referencing any date (denial date, service date, appeal deadline) not in the data above
  - Including any claim identifier (member ID, policy number, claim number) not in the data above
  - Listing any enclosure that was not explicitly confirmed (see enclosure rule below)
  - Using ANY legal citation not from the APPROVED CITATIONS list above
If a fact is unknown, OMIT IT ENTIRELY. Never use a placeholder, approximate, or "typical" value.`;

// Per-category prompt context injected into analysis + letter generation
const CATEGORY_CONTEXT = {
  medical_necessity: {
    appealType:    "Medical Necessity Appeal",
    coreArgument:  "The denied service is medically necessary for this patient's specific diagnosis and clinical situation.",
    approach:      "Challenge the denial on medical necessity grounds. Reference treating physician's clinical judgment and the documented failure of prior treatments. Request peer-to-peer review with the denying physician.",
  },
  experimental: {
    appealType:    "Experimental/Investigational Appeal",
    coreArgument:  "The denied treatment has clinical evidence of efficacy and is not experimental. It represents accepted medical practice for this condition.",
    approach:      "Challenge the experimental classification. Note that ACA mandates external review rights specifically for experimental denials. Demand the insurer disclose the exact clinical criteria and database (e.g., MCG, InterQual) used to classify the treatment as experimental.",
  },
  prior_auth: {
    appealType:    "Retroactive Prior Authorization Request",
    coreArgument:  "The service was medically necessary and urgent. Request retroactive authorization and processing of the claim on its merits.",
    approach:      "Request retroactive prior authorization. Argue medical necessity and urgency precluded obtaining prior auth. Note that denial of retroactive auth is itself appealable under ERISA and ACA.",
  },
  plan_exclusion: {
    appealType:    "Coverage Dispute — Benefit Determination",
    coreArgument:  "The denied service is a covered benefit under the plan and/or is required under ACA essential health benefit mandates.",
    approach:      "Argue the service falls within covered benefits. Reference ACA essential health benefit categories. Demand the exact plan exclusion language and the page number in the plan document where it appears.",
  },
  out_of_network: {
    appealType:    "Surprise Billing Appeal — No Surprises Act",
    coreArgument:  "This claim is protected under the No Surprises Act (42 U.S.C. § 300gg-111). Balance billing is unlawful and the claim must be processed at in-network cost-sharing rates.",
    approach:      "Invoke No Surprises Act protections. If emergency services were involved, cite the emergency exception. Demand reprocessing at in-network rates. Note that balance billing violations carry federal penalties.",
  },
  late_filing: {
    appealType:    "Administrative Appeal — Timely Filing",
    coreArgument:  "The patient should not be penalized for the provider's administrative filing error. The underlying service was covered and appropriate.",
    approach:      "Argue the patient bears no responsibility for the provider's filing timeline. Under equitable principles and applicable regulations, the claim must be processed on its merits. Request a waiver of the timely filing requirement.",
  },
  eligibility: {
    appealType:    "Coverage Eligibility Appeal",
    coreArgument:  "The patient was continuously enrolled and covered on the date of service. This denial appears to be an administrative error in the insurer's records.",
    approach:      "Request verification of enrollment records. Assert continuous coverage and demand the insurer provide documentation supporting their eligibility determination. Demand correction and reprocessing.",
  },
};

module.exports = { APPROVED_CITATIONS, CITATION_LIST, ZERO_HALLUCINATION_BLOCK, CATEGORY_CONTEXT };
