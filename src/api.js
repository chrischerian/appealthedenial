const BASE = "http://localhost:3001/api";
const SESSION_KEY = "atd_admin_token";

// ── Auth helpers ──────────────────────────────────────────────────────────────
export function getAdminToken() {
  return sessionStorage.getItem(SESSION_KEY) || "";
}
export function setAdminToken(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}
export function clearAdminToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": getAdminToken(),
  };
}

async function handleResponse(r) {
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || `Request failed: ${r.status}`);
  }
  return r.json();
}

async function readStream(resp, onChunk) {
  if (!resp.ok) throw new Error(`Stream request failed: ${resp.status}`);
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const j = JSON.parse(line.slice(6));
        if (j.error) throw new Error(j.error);
        if (j.chunk) onChunk(j.chunk);
        if (j.done) return;
      } catch (e) {
        if (e.message && !e.message.startsWith("Unexpected")) throw e;
      }
    }
  }
}

// ── Admin auth ────────────────────────────────────────────────────────────────
export const adminLogin = (password) =>
  fetch(`${BASE}/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  }).then(handleResponse);

// ── Customer ──────────────────────────────────────────────────────────────────
export const submitCase = ({
  name, insurer, procedure, denialReason, memberID, claimNumber, email,
  denialFile, authorizedSend, hipaaAuthorized,
  symptoms, conditionDuration, medicalHistory, priorTreatments, urgency,
}) => {
  const fd = new FormData();
  fd.append("name",             name             || "");
  fd.append("insurer",          insurer);
  fd.append("procedure",        procedure);
  fd.append("denialReason",     denialReason);
  fd.append("memberID",         memberID         || "");
  fd.append("claimNumber",      claimNumber      || "");
  fd.append("email",            email);
  fd.append("authorizedSend",   authorizedSend   ? "true" : "false");
  fd.append("hipaaAuthorized",  hipaaAuthorized  ? "true" : "false");
  fd.append("symptoms",         symptoms         || "");
  fd.append("conditionDuration",conditionDuration || "");
  fd.append("medicalHistory",   medicalHistory   || "");
  fd.append("priorTreatments",  priorTreatments  || "");
  fd.append("urgency",          urgency          || "routine");
  if (denialFile) fd.append("denialLetter", denialFile);
  return fetch(`${BASE}/submit`, { method: "POST", body: fd }).then(handleResponse);
};

export const getStatus = (email) =>
  fetch(`${BASE}/status?email=${encodeURIComponent(email)}`).then(handleResponse);

// ── Admin / Cases ─────────────────────────────────────────────────────────────
export const getCases = () =>
  fetch(`${BASE}/cases`, { headers: adminHeaders() }).then(handleResponse);

export const getCase = (id) =>
  fetch(`${BASE}/cases/${id}`, { headers: adminHeaders() }).then(handleResponse);

export const createCase = (data) =>
  fetch(`${BASE}/cases`, { method: "POST", headers: adminHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const updateCase = (id, data) =>
  fetch(`${BASE}/cases/${id}`, { method: "PATCH", headers: adminHeaders(), body: JSON.stringify(data) }).then(handleResponse);

// ── Admin / AI ────────────────────────────────────────────────────────────────
export const analyzeCase = (caseId) =>
  fetch(`${BASE}/ai/analyze`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ caseId }) }).then(handleResponse);

export async function streamLetter(caseId, onChunk) {
  const resp = await fetch(`${BASE}/ai/letter`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ caseId }),
  });
  await readStream(resp, onChunk);
}

export async function streamChat(messages, caseId, onChunk) {
  const resp = await fetch(`${BASE}/ai/chat`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ messages, caseId }),
  });
  await readStream(resp, onChunk);
}

export async function streamExternalReview(caseId, onChunk) {
  const resp = await fetch(`${BASE}/ai/external-review`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ caseId }),
  });
  await readStream(resp, onChunk);
}

export const getDeadlines = (days = 7) =>
  fetch(`${BASE}/cases/meta/deadlines?days=${days}`, { headers: adminHeaders() }).then(handleResponse);

export const deleteCase = (id) =>
  fetch(`${BASE}/cases/${id}`, { method: "DELETE", headers: adminHeaders() }).then(handleResponse);

// Customer: submit additional info via update token
export const submitUpdateInfo = (token, fields) =>
  fetch(`${BASE}/update-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, fields }),
  }).then(handleResponse);
