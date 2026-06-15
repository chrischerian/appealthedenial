const { callAnthropic } = require("../anthropic.cjs");

async function classifyDenial(combined) {
  try {
    const resp = await callAnthropic({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: "You are an insurance claims specialist. Classify insurance denial reasons precisely. Return ONLY raw JSON.",
      messages: [{
        role: "user",
        content: `Classify this insurance denial into exactly one category.

Denial reason: "${combined.denialReason}"
Procedure: "${combined.procedure}"
Insurer: "${combined.insurer}"

Categories (pick the single best fit):
- billing_error: wrong/invalid procedure code, diagnosis code mismatch, missing modifier, unbundling, "not covered as billed", coding issue
- late_filing: claim filed after timely filing limit
- eligibility: patient not eligible, not enrolled, coverage terminated on date of service
- prior_auth: authorization not obtained before service, no prior auth on file
- medical_necessity: not medically necessary, lacks clinical evidence, not supported by diagnosis
- experimental: experimental, investigational, unproven, not FDA approved, lacks peer-reviewed evidence
- plan_exclusion: not a covered benefit, excluded service, cosmetic, plan doesn't cover this
- out_of_network: out-of-network provider, non-participating provider, balance billing, surprise billing

Return: { "category": "<one of the above>", "confidence": "high|medium|low", "rationale": "one sentence" }`,
      }],
    });
    const data   = await resp.json();
    if (data.type === "error") throw new Error(data.error?.message);
    const result = JSON.parse((data.content?.[0]?.text || "").replace(/```json|```/g, "").trim());
    return result;
  } catch (err) {
    console.error("[classifyDenial] Failed:", err.message, "— defaulting to medical_necessity");
    return { category: "medical_necessity", confidence: "low", rationale: "Classification failed" };
  }
}

module.exports = { classifyDenial };
