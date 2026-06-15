const { db, parseCase, trackTimeline } = require("../db.cjs");
const { callAnthropic }                = require("../anthropic.cjs");
const { APPROVED_CITATIONS, CITATION_LIST, ZERO_HALLUCINATION_BLOCK, CATEGORY_CONTEXT } = require("../prompts.cjs");
const { extractDocumentData }          = require("./extractor.cjs");
const { classifyDenial }               = require("./classifier.cjs");
const { submitAppeal }                 = require("./delivery.cjs");
const { sendEmail }                    = require("./mailer.cjs");

// ── Info assessor ─────────────────────────────────────────────────────────────
async function assessRequiredInfo(combined) {
  try {
    const resp = await callAnthropic({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: "You are an insurance appeals attorney. Assess whether there is enough information to draft a specific, non-generic appeal letter.",
      messages: [{
        role: "user",
        content: `All information collected for this appeal:
${JSON.stringify(combined, null, 2)}

What is CRITICALLY missing? Only flag fields truly required (not nice-to-have).
Typically required: patient full name, at least one claim identifier (member ID, policy #, or claim #), procedure denied, denial reason, insurer name.

Return ONLY raw JSON: { "canProceed": true/false, "missing": ["field label"], "reason": "one sentence" }`,
      }],
    });
    const data = await resp.json();
    if (data.type === "error") return { canProceed: true, missing: [], reason: "" };
    return JSON.parse((data.content?.[0]?.text || "").replace(/```json|```/g, "").trim());
  } catch {
    return { canProceed: true, missing: [], reason: "" };
  }
}

// ── Billing error handler ─────────────────────────────────────────────────────
async function processBillingError(caseId, email, combined) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  trackTimeline(caseId, "Billing/coding error identified — generating provider notification letter");
  db.prepare("UPDATE cases SET status = 'Provider Action Needed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);

  const knownFields = Object.entries(combined)
    .filter(([k, v]) => v !== null && v !== undefined && !["authorizedSend", "hipaaAuthorized", "hasDenialLetter", "patientEmail"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Write a formal letter addressed to the BILLING DEPARTMENT of the patient's healthcare provider (not the insurance company).
${ZERO_HALLUCINATION_BLOCK}

CONFIRMED INFORMATION (use ONLY these fields):
${knownFields}

DATE TODAY: ${today}

Requirements:
1. Address to: "[Provider Name] Billing Department" (use actual provider name if known)
2. Identify the denied claim using ONLY confirmed identifiers
3. State the exact denial reason from the insurer
4. Request the provider review and resubmit a corrected claim within 30 days
5. Note the patient's right to have covered services processed
6. Be professional and factual — not adversarial
7. Include patient email only (no invented contact info)
8. End with a blank signature line

Do not address this to the insurance company. Do not mention AppealTheDenial in the body.

After signature add:
---
This letter was prepared with the assistance of AppealTheDenial (appealthedenial.com). Not legal advice.`;

  let providerLetter = "";
  try {
    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 1500, stream: false,
      system: "You are an expert in insurance billing. Write professional letters to provider billing departments. Use ONLY confirmed facts.",
      messages: [{ role: "user", content: prompt }],
    });
    const data = await resp.json();
    if (data.type === "error") throw new Error(data.error?.message);
    providerLetter = data.content?.[0]?.text || "";
    if (!providerLetter) throw new Error("Empty response");
  } catch (err) {
    console.error(`[CASE ${caseId}] Provider letter generation failed:`, err.message);
    trackTimeline(caseId, `Provider letter generation failed: ${err.message}`);
    db.prepare("UPDATE cases SET status = 'Error', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);
    return;
  }

  db.prepare("UPDATE cases SET letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(providerLetter, caseId);
  trackTimeline(caseId, "Provider notification letter generated");

  const patientBody = `Hi${combined.patientName ? ` ${combined.patientName}` : ""},

Your insurance claim was denied due to a billing or coding issue — the error is on your provider's end, not the insurer's.

WHAT THIS MEANS:
Your provider's billing office needs to correct and resubmit the claim. This is common and typically resolved in a few weeks.

WHAT WE'VE DONE:
We've prepared a letter for your provider's billing department explaining exactly what needs to be corrected. The letter is attached.

WHAT YOU SHOULD DO:
1. Forward the attached letter to your provider's billing department, or drop it off at their front desk.
2. Follow up with them in 1–2 weeks to confirm they've resubmitted.
3. If they haven't resubmitted within 30 days, reply to this email and we'll follow up.

— The AppealTheDenial Team`;

  await sendEmail(email, `Action on Your Claim — Provider Billing Correction Needed (${combined.insurer})`, patientBody, providerLetter);
  trackTimeline(caseId, "Patient notified — provider billing correction required");
  console.log(`[CASE ${caseId}] Billing error handled.`);
}

// ── Main case processor ───────────────────────────────────────────────────────
async function processCase(caseId, email, denialFile) {
  console.log(`[CASE ${caseId}] Processing for ${email}`);
  trackTimeline(caseId, "Case received — beginning document analysis");
  db.prepare("UPDATE cases SET status = 'Analyzing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);

  // 1. Extract document data
  let extracted = {};
  if (denialFile) {
    extracted = await extractDocumentData(caseId, denialFile);
    const r = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
    let n = {};
    try { n = r?.notes ? JSON.parse(r.notes) : {}; } catch {}
    n.extracted = extracted;
    db.prepare("UPDATE cases SET notes = ? WHERE id = ?").run(JSON.stringify(n), caseId);
  }

  // 2. Build combined data — form fields override extracted
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(caseId);
  const c   = parseCase(row);

  const combined = {
    patientName:    c.notes?.patientName    || extracted.patientName    || null,
    insurer:        c.insurer               || extracted.insurer         || null,
    procedure:      c.procedure             || extracted.procedure       || null,
    denialReason:   c.denial_reason         || extracted.denialReason    || null,
    memberID:       c.policy_id || c.notes?.memberID || extracted.memberID || extracted.policyNumber || null,
    claimNumber:    c.notes?.claimNumber    || extracted.claimNumber     || extracted.referenceNumber || null,
    dateOfDenial:   extracted.dateOfDenial  || null,
    appealDeadline: extracted.appealDeadline || null,
    providerName:   c.doctor_name           || extracted.providerName    || null,
    patientAddress: extracted.patientAddress || c.notes?.patientAddress  || null,
    providerAddress: extracted.providerAddress || null,
    diagnosisCodes: extracted.diagnosisCodes || c.notes?.diagnosis       || null,
    procedureCode:  extracted.procedureCode  || c.notes?.cptCodes        || null,
    planName:       extracted.planName       || c.notes?.planName        || null,
    groupNumber:    extracted.groupNumber    || null,
    insurerAddress: extracted.insurerAddress || null,
    appealAddress:  extracted.appealAddress  || null,
    insurerFax:     extracted.insurerFax     || null,
    reviewerName:   extracted.reviewerName   || null,
    dateOfService:  extracted.dateOfService  || null,
    providerPhone:  extracted.providerPhone  || c.notes?.providerPhone   || null,
    denialCode:     extracted.denialCode     || null,
    // clinical context
    medicalHistory: c.notes?.medicalHistory  || null,
    priorTreatments: c.notes?.priorTreatments || null,
    symptoms:       c.notes?.symptoms        || null,
    conditionDuration: c.notes?.conditionDuration || null,
    urgency:        c.notes?.urgency         || null,
    // meta
    patientEmail:    email,
    hasDenialLetter: !!(c.notes?.hasDenialLetter || denialFile),
    authorizedSend:  !!c.authorized_send || !!(c.notes?.authorizedSend),
    hipaaAuthorized: !!c.hipaa_authorized || !!(c.notes?.hipaaAuthorized),
  };

  // Persist appeal deadline if extracted
  if (combined.appealDeadline) {
    db.prepare("UPDATE cases SET appeal_deadline = ? WHERE id = ?").run(combined.appealDeadline, caseId);
  }

  // 3. Classify denial + route
  trackTimeline(caseId, "Classifying denial type");
  const classification = await classifyDenial(combined);
  db.prepare("UPDATE cases SET denial_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(classification.category, caseId);
  trackTimeline(caseId, `Denial classified: ${classification.category} (${classification.confidence} confidence) — ${classification.rationale}`);

  if (classification.category === "billing_error") {
    return processBillingError(caseId, email, combined);
  }

  // 4. Assess info completeness
  trackTimeline(caseId, "Assessing required information");
  const assessment = await assessRequiredInfo(combined);

  if (!assessment.canProceed) {
    // Generate a re-entry token so the customer can add missing info via web form
    const crypto = require("crypto");
    const updateToken = crypto.randomBytes(24).toString("hex");
    const r  = db.prepare("SELECT notes FROM cases WHERE id = ?").get(caseId);
    let notes = {};
    try { notes = r?.notes ? JSON.parse(r.notes) : {}; } catch {}
    notes.updateToken   = updateToken;
    notes.missingFields = assessment.missing;
    db.prepare("UPDATE cases SET notes = ?, status = 'Info Needed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(notes), caseId);
    trackTimeline(caseId, `Missing info: ${assessment.missing.join(", ")} — emailing customer`);

    const appUrl = process.env.PUBLIC_URL || "http://localhost:5173";
    const updateUrl = `${appUrl}/update?token=${updateToken}`;
    const missingList = assessment.missing.map((f) => `  • ${f}`).join("\n");

    await sendEmail(
      email,
      `Action Required — We need a few more details (${combined.insurer} / ${combined.procedure})`,
      `Hi${combined.patientName ? ` ${combined.patientName}` : ""},

We received your appeal request. To draft a complete, specific letter, we need a few more details:

${missingList}

You can find this on your Explanation of Benefits (EOB), insurance card, or denial letter.

Simply click the link below to add the missing info and we'll complete your appeal immediately:

${updateUrl}

Or reply to this email with the information above.

— The AppealTheDenial Team`
    );
    console.log(`[CASE ${caseId}] Info request sent.`);
    return;
  }

  // 5. Run AI analysis
  trackTimeline(caseId, "All required info confirmed — running denial analysis");
  const categoryCtx = CATEGORY_CONTEXT[classification.category] || CATEGORY_CONTEXT.medical_necessity;

  // Build clinical context block if available
  const clinicalContext = [
    combined.medicalHistory     && `Medical history: ${combined.medicalHistory}`,
    combined.priorTreatments    && `Prior treatments tried and failed: ${combined.priorTreatments}`,
    combined.symptoms           && `Symptoms: ${combined.symptoms}`,
    combined.conditionDuration  && `Duration of condition: ${combined.conditionDuration}`,
    combined.urgency            && `Urgency level: ${combined.urgency}`,
    combined.diagnosisCodes     && `Diagnosis codes: ${combined.diagnosisCodes}`,
    combined.procedureCode      && `Procedure codes: ${combined.procedureCode}`,
  ].filter(Boolean).join("\n");

  const analysisPrompt = `Analyze this insurance denial. Return ONLY raw JSON with these exact keys:
summary, strategy, winProbability, urgency, keyArgs, nextSteps, timeframe, escalationPath, legalCitations, evidenceNeeded

DENIAL TYPE: ${categoryCtx.appealType}
APPEAL APPROACH: ${categoryCtx.approach}
${clinicalContext ? `\nCLINICAL CONTEXT:\n${clinicalContext}` : ""}

Rules:
- summary: 1 sentence, confirmed facts only
- strategy: 2-3 sentences using the APPEAL APPROACH above
- winProbability: 0-100 integer calibrated to this denial type
- urgency: "low" | "medium" | "high"
- keyArgs: array of 4-5 argument strings based ONLY on confirmed facts${clinicalContext ? " — incorporate clinical context" : ""}
- nextSteps: array of 5-6 ordered action strings specific to this denial type
- timeframe: string like "30-60 days"
- escalationPath: array of 3 strings
- legalCitations: array of 2-4 strings chosen EXCLUSIVELY from:
${CITATION_LIST}
- evidenceNeeded: array of 3-5 strings for this denial type

Denial details:
${JSON.stringify(combined, null, 2)}`;

  let analysis;
  try {
    const aResp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 1500, stream: false,
      system: "You are an expert insurance appeals attorney. Return ONLY raw JSON, no markdown. Base all analysis strictly on provided facts.",
      messages: [{ role: "user", content: analysisPrompt }],
    });
    const aData = await aResp.json();
    if (aData.type === "error") throw new Error(aData.error?.message || JSON.stringify(aData.error));
    const rawText = (aData.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
    if (!rawText) throw new Error("Empty analysis response");
    analysis = JSON.parse(rawText);
  } catch (err) {
    console.error(`[CASE ${caseId}] Analysis failed (${err.message}) — using fallback`);
    trackTimeline(caseId, "AI analysis unavailable — using fallback");
    analysis = {
      winProbability: 65,
      summary: `Appeal for denial of "${combined.procedure || "treatment"}" by ${combined.insurer || "insurer"}.`,
      urgency: "medium",
      keyArgs: [
        `The denial of "${combined.procedure || "this treatment"}" is not supported by the clinical record`,
        combined.denialReason ? `The stated reason ("${combined.denialReason}") fails to meet the standard for coverage denial under applicable law` : "Denial reason challenged on clinical grounds",
        combined.priorTreatments ? `Prior treatments have been exhausted: ${combined.priorTreatments}` : "All less-invasive alternatives have been considered",
      ].filter(Boolean),
      legalCitations: APPROVED_CITATIONS.slice(0, 3),
      evidenceNeeded: ["Treating physician's clinical notes", "Prior authorization correspondence", "Explanation of Benefits"],
      escalationPath: ["File complaint with state insurance commissioner", "Request independent external review per ACA § 2719"],
      nextSteps: ["Review and sign appeal letter", "Send via certified mail with return receipt", "Follow up in 30 days"],
      timeframe: "30-60 days",
      strategy: `Appeal on ${categoryCtx.appealType} grounds. ${categoryCtx.coreArgument}`,
    };
  }

  db.prepare("UPDATE cases SET analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(analysis), caseId);
  trackTimeline(caseId, `Analysis complete — win probability ${analysis.winProbability}%, urgency: ${analysis.urgency}`);

  // 6. Draft the letter
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const knownFields = Object.entries(combined)
    .filter(([, v]) => v !== null && v !== undefined && v !== false && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const letterPrompt = `Draft a formal insurance appeal letter. This is a ${categoryCtx.appealType}.
${ZERO_HALLUCINATION_BLOCK}

APPEAL TYPE: ${categoryCtx.appealType}
CORE ARGUMENT: ${categoryCtx.coreArgument}

CONFIRMED INFORMATION (use ONLY these fields):
${knownFields}

KEY ARGUMENTS (use only these — do not add claims or embellish):
${(analysis.keyArgs || []).join("\n")}

APPROVED LEGAL CITATIONS — choose 2-4 most applicable; use NO others:
${CITATION_LIST}

DATE TODAY: ${today}
DENIAL LETTER ON FILE: ${combined.hasDenialLetter ? "YES — patient has the original denial letter" : "NO"}

LETTER STRUCTURE (follow exactly):
1. Date (today only)
2. Patient contact block — ONLY fields present in CONFIRMED INFORMATION
3. Insurer address block — ONLY fields present; if unknown, insurer name only
4. Re: line — all known claim identifiers; omit unknown ones
5. Opening: "I am writing to formally appeal the denial of..."
6. Core argument — use CORE ARGUMENT above; argue on confirmed facts; cite NO studies, guidelines, or statistics
7. Legal rights section — cite 2-4 approved citations only
8. Demand reviewer credentials and peer-to-peer review
9. Reference ACA federally mandated right to independent external review
10. Hard 30-day deadline for written response
11. Enclosures — ONLY if DENIAL LETTER ON FILE is YES: write "Enclosures: Original Denial Letter"; if NO: omit entirely
12. Patient signature block with name and blank date line
13. This exact disclaimer:

---
This appeal letter was prepared with the assistance of AppealTheDenial (appealthedenial.com). AppealTheDenial is not a law firm and this document does not constitute legal advice. Review carefully before signing and submitting.`;

  let letter = "";
  try {
    const lResp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 3000, stream: false,
      system: "You are an expert insurance appeals attorney. Write formal, legally precise, assertive appeal letters in first person from the patient's perspective. Use ONLY the facts provided — never invent names, IDs, dates, addresses, or any details.",
      messages: [{ role: "user", content: letterPrompt }],
    });
    const lData = await lResp.json();
    if (lData.type === "error") throw new Error(lData.error?.message || JSON.stringify(lData.error));
    letter = lData.content?.[0]?.text || "";
    if (!letter) throw new Error("Empty letter response");
  } catch (err) {
    console.error(`[CASE ${caseId}] Letter generation failed:`, err.message);
    db.prepare("UPDATE cases SET status = 'Error', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(caseId);
    trackTimeline(caseId, `Letter generation failed: ${err.message}`);
    return;
  }

  db.prepare("UPDATE cases SET letter = ?, status = 'Letter Ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(letter, caseId);
  trackTimeline(caseId, "Appeal letter drafted — confirmed facts only");

  // 7. Auto-submit if authorized
  const submission = await submitAppeal(caseId, combined, letter);

  // 8. Email customer
  let subject, body;
  if (submission?.method === "fax") {
    subject = `Your Appeal Has Been Filed — ${combined.insurer} / ${combined.procedure}`;
    body = `Hi${combined.patientName ? ` ${combined.patientName}` : ""},

We have filed your appeal on your behalf.

FILED VIA: Fax to ${combined.insurer}
CONFIRMATION: ${submission.confirmation}
SENT: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${combined.appealDeadline ? `\nAPPEAL DEADLINE: ${combined.appealDeadline}` : ""}

WHAT HAPPENS NEXT:
1. ${combined.insurer} must acknowledge within 5 business days
2. Decision required within 30–60 days
3. If denied again, you have the right to independent external review
4. Reply to this email if no response within 30 days

Your letter is attached for your records.

— The AppealTheDenial Team`;

  } else if (submission?.method === "mail") {
    subject = `Your Appeal Has Been Filed — ${combined.insurer} / ${combined.procedure}`;
    body = `Hi${combined.patientName ? ` ${combined.patientName}` : ""},

We have filed your appeal via USPS Certified Mail.

SENT TO: ${combined.insurer} Appeals Department
${submission.tracking ? `USPS TRACKING: ${submission.tracking}` : ""}
${submission.eta ? `ESTIMATED DELIVERY: ${submission.eta}` : "ESTIMATED DELIVERY: 3–5 business days"}${combined.appealDeadline ? `\nAPPEAL DEADLINE: ${combined.appealDeadline}` : ""}

WHAT HAPPENS NEXT:
1. Certified mail creates a legal record of your submission date
2. ${combined.insurer} must respond within 30–60 days
3. If denied again, you have the right to independent external review
4. Reply if no response within 45 days

Your letter is attached for your records.

— The AppealTheDenial Team`;

  } else {
    const filingInstructions = combined.appealAddress
      ? `Send to: ${combined.appealAddress}`
      : "Send to your insurance company's appeals department via certified mail. The address is on your denial letter or insurance card.";

    subject = `Your Appeal Letter is Ready — ${combined.insurer} / ${combined.procedure}`;
    body = `Hi${combined.patientName ? ` ${combined.patientName}` : ""},

Your appeal letter for "${combined.procedure}" denied by ${combined.insurer} is ready. It is attached.

TO FILE YOUR APPEAL:
${filingInstructions}${combined.appealDeadline ? `\n\nAPPEAL DEADLINE: ${combined.appealDeadline} — do not miss this date.` : ""}

STEPS:
1. Review the letter carefully
2. Sign where indicated
3. Send via certified mail with return receipt requested
4. Keep a copy of everything
5. Follow up in 30 days if no response

You have the right to appeal — and this letter is built to win.

— The AppealTheDenial Team`;
  }

  await sendEmail(email, subject, body, letter);
  trackTimeline(caseId, `Customer notified via email — ${submission ? `filed via ${submission.method}` : "letter ready for customer to file"}`);
  console.log(`[CASE ${caseId}] Processing complete.`);
}

module.exports = { processCase, processBillingError, assessRequiredInfo };
