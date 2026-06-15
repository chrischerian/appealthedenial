const { db, trackTimeline } = require("../db.cjs");

const LOB_API_KEY        = process.env.LOB_API_KEY        || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  || "";
const TWILIO_FAX_NUMBER  = process.env.TWILIO_FAX_NUMBER  || "";
const PUBLIC_URL         = process.env.PUBLIC_URL         || "";
const CF_NAME    = process.env.ATD_NAME     || "AppealTheDenial";
const CF_ADDR1   = process.env.ATD_ADDRESS1 || "";
const CF_CITY    = process.env.ATD_CITY     || "";
const CF_STATE   = process.env.ATD_STATE    || "";
const CF_ZIP     = process.env.ATD_ZIP      || "";

// Insurer appeal addresses — fallback when not on denial letter.
// Verify before production use; addresses change periodically.
const INSURER_MAIL = {
  aetna: {
    name: "Aetna Member Appeals", address_line1: "P.O. Box 14294",
    address_city: "Lexington", address_state: "KY", address_zip: "40512", address_country: "US",
  },
  unitedhealthcare: {
    name: "UnitedHealthcare Member Appeals", address_line1: "P.O. Box 30432",
    address_city: "Salt Lake City", address_state: "UT", address_zip: "84130", address_country: "US",
  },
  cigna: {
    name: "Cigna Appeals", address_line1: "P.O. Box 188004",
    address_city: "Chattanooga", address_state: "TN", address_zip: "37422", address_country: "US",
  },
  humana: {
    name: "Humana Member Appeals", address_line1: "P.O. Box 14601",
    address_city: "Lexington", address_state: "KY", address_zip: "40512", address_country: "US",
  },
  kaiser: {
    name: "Kaiser Permanente Member Services", address_line1: "P.O. Box 23219",
    address_city: "Oakland", address_state: "CA", address_zip: "94623", address_country: "US",
  },
};

function lookupInsurerAddress(name) {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  for (const [k, v] of Object.entries(INSURER_MAIL)) {
    if (key.includes(k) || k.includes(key.slice(0, 6))) return { ...v };
  }
  return null;
}

function parseUSAddress(text) {
  if (!text || typeof text !== "string") return null;
  try {
    const s = text.replace(/\r?\n/g, ", ").replace(/\s{2,}/g, " ").trim();
    const zipM = s.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (!zipM) return null;
    const beforeZip  = s.slice(0, zipM.index).replace(/,\s*$/, "").trim();
    const stateM     = beforeZip.match(/,\s*([A-Z]{2})\s*$/i);
    if (!stateM) return null;
    const beforeState = beforeZip.slice(0, stateM.index).trim();
    const cityM      = beforeState.match(/,\s*([^,]{2,40}?)\s*$/);
    if (!cityM) return null;
    const addr1 = beforeState.slice(0, cityM.index).replace(/^,\s*/, "").trim();
    if (!addr1) return null;
    return {
      address_line1: addr1, address_city: cityM[1].trim(),
      address_state: stateM[1].toUpperCase(), address_zip: zipM[1], address_country: "US",
    };
  } catch { return null; }
}

function letterToHtml(text) {
  const esc  = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = esc.split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.55;color:#000;}
p{margin:0 0 10px 0;}
</style></head><body>${body}</body></html>`;
}

// Short-lived tokens for Twilio fax document delivery (1-hour TTL)
const _faxTokens = new Map();

async function sendViaFax(letter, toFaxNumber, caseId) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FAX_NUMBER) {
    throw new Error("Twilio credentials not configured");
  }
  if (!PUBLIC_URL) {
    throw new Error("PUBLIC_URL env var required for Twilio fax");
  }
  const token = `${caseId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  _faxTokens.set(token, { letter, expires: Date.now() + 60 * 60 * 1000 });

  const params = new URLSearchParams({
    From:            TWILIO_FAX_NUMBER,
    To:              toFaxNumber.replace(/[^\d+]/g, ""),
    MediaUrl:        `${PUBLIC_URL}/api/fax-content/${token}`,
    Quality:         "fine",
    StatusCallback:  `${PUBLIC_URL}/api/fax-status/${caseId}`,
  });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const resp = await fetch("https://fax.twilio.com/v1/Faxes", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || `Twilio error ${resp.status}`);
  return data;
}

async function sendViaMail(letter, toAddress, caseId) {
  if (!LOB_API_KEY) throw new Error("LOB_API_KEY not configured");
  if (!CF_ADDR1 || !CF_CITY || !CF_STATE || !CF_ZIP) {
    throw new Error("AppealTheDenial return address not configured (ATD_ADDRESS1 etc.)");
  }
  const from = { name: CF_NAME, address_line1: CF_ADDR1, address_city: CF_CITY, address_state: CF_STATE, address_zip: CF_ZIP, address_country: "US" };
  const to   = { ...toAddress };
  if (!to.name) to.name = to.address_line1;

  const auth = Buffer.from(`${LOB_API_KEY}:`).toString("base64");
  const resp = await fetch("https://api.lob.com/v1/letters", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to, from,
      color: false, double_sided: false,
      address_placement: "insert_blank_page",
      mail_type: "usps_first_class",
      extra_service: "certified",
      html: letterToHtml(letter),
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Lob error ${resp.status}`);
  return data;
}

/**
 * Auto-submits the appeal via fax → certified mail → graceful no-op.
 * Only runs when combined.authorizedSend is true.
 */
async function submitAppeal(caseId, combined, letter) {
  if (!combined.authorizedSend) return null;

  // 1. Fax — only use a number extracted from the insurer's own document
  const faxNumber = combined.insurerFax || null;
  if (faxNumber && TWILIO_ACCOUNT_SID && PUBLIC_URL) {
    try {
      const r = await sendViaFax(letter, faxNumber, caseId);
      trackTimeline(caseId, `Appeal faxed to ${combined.insurer} (${faxNumber}) — SID: ${r.sid}`);
      db.prepare(
        "UPDATE cases SET status = 'Letter Sent', delivery_method = 'fax', delivery_tracking = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(r.sid, caseId);
      return { method: "fax", confirmation: r.sid, faxNumber };
    } catch (err) {
      console.error(`[CASE ${caseId}] Fax failed: ${err.message} — trying certified mail`);
      trackTimeline(caseId, `Fax failed: ${err.message} — falling back to certified mail`);
    }
  }

  // 2. Certified mail
  const parsedAddr = combined.appealAddress ? parseUSAddress(combined.appealAddress) : null;
  const toAddress  = parsedAddr || lookupInsurerAddress(combined.insurer);
  if (toAddress && LOB_API_KEY) {
    try {
      if (!toAddress.name) toAddress.name = `${combined.insurer || "Insurance Company"} Appeals`;
      const r = await sendViaMail(letter, toAddress, caseId);
      const tracking = r.tracking_number ? ` — USPS: ${r.tracking_number}` : "";
      const eta      = r.expected_delivery_date ? ` (est. ${r.expected_delivery_date})` : "";
      trackTimeline(caseId, `Appeal mailed via USPS Certified to ${combined.insurer}${tracking}${eta} — Lob: ${r.id}`);
      db.prepare(
        "UPDATE cases SET status = 'Letter Sent', delivery_method = 'mail', delivery_tracking = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(r.tracking_number || r.id, caseId);
      return { method: "mail", tracking: r.tracking_number, eta: r.expected_delivery_date, lobId: r.id };
    } catch (err) {
      console.error(`[CASE ${caseId}] Certified mail failed: ${err.message}`);
      trackTimeline(caseId, `Certified mail failed: ${err.message}`);
    }
  }

  // 3. No delivery method available
  trackTimeline(caseId, "Auto-submission skipped — add LOB_API_KEY + Twilio creds to .env to enable");
  return null;
}

module.exports = { submitAppeal, sendViaFax, sendViaMail, _faxTokens, lookupInsurerAddress, parseUSAddress };
