const { callAnthropic }  = require("../anthropic.cjs");
const { trackTimeline }  = require("../db.cjs");

const EXTRACT_PROMPT = `This is an insurance-related document. Extract every piece of information present and return ONLY a JSON object. Use null for any field not found — do not guess or invent values.

{
  "patientName": null,
  "memberID": null,
  "policyNumber": null,
  "claimNumber": null,
  "groupNumber": null,
  "planName": null,
  "insurer": null,
  "insurerAddress": null,
  "insurerPhone": null,
  "insurerEmail": null,
  "insurerFax": null,
  "appealAddress": null,
  "dateOfDenial": null,
  "dateOfService": null,
  "appealDeadline": null,
  "procedure": null,
  "procedureCode": null,
  "diagnosisCodes": null,
  "denialReason": null,
  "denialCode": null,
  "providerName": null,
  "providerAddress": null,
  "providerPhone": null,
  "patientAddress": null,
  "patientPhone": null,
  "reviewerName": null,
  "reviewerCredentials": null,
  "referenceNumber": null
}`;

async function extractDocumentData(caseId, file) {
  const isImage = file.mimetype.startsWith("image/");
  const isPdf   = file.mimetype === "application/pdf";
  if (!isImage && !isPdf) return {};

  trackTimeline(caseId, "Analyzing uploaded document — extracting all fields");

  const content = isImage
    ? [
        { type: "image",    source: { type: "base64", media_type: file.mimetype, data: file.buffer.toString("base64") } },
        { type: "text",     text: EXTRACT_PROMPT },
      ]
    : [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.buffer.toString("base64") } },
        { type: "text",     text: EXTRACT_PROMPT },
      ];

  try {
    const resp = await callAnthropic({
      model: "claude-sonnet-4-6", max_tokens: 1000,
      messages: [{ role: "user", content }],
    });
    const data = await resp.json();
    const text = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(text);
    // Strip nulls so we can cleanly merge with form data
    Object.keys(extracted).forEach((k) => extracted[k] === null && delete extracted[k]);
    trackTimeline(caseId, `Document parsed — extracted: ${Object.keys(extracted).join(", ") || "no fields found"}`);
    return extracted;
  } catch (err) {
    console.error(`[CASE ${caseId}] Document extraction failed:`, err.message);
    trackTimeline(caseId, "Document parsing failed — continuing with form data only");
    return {};
  }
}

module.exports = { extractDocumentData };
