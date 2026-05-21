const BASE = "http://localhost:3001/api";

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

// ── Customer ──────────────────────────────────────────────────────────────────
export const submitCase = ({ name, insurer, procedure, denialReason, email, denialFile }) => {
  const fd = new FormData();
  fd.append("name", name || "");
  fd.append("insurer", insurer);
  fd.append("procedure", procedure);
  fd.append("denialReason", denialReason);
  fd.append("email", email);
  if (denialFile) fd.append("denialLetter", denialFile);
  return fetch(`${BASE}/submit`, { method: "POST", body: fd }).then(handleResponse);
};

export const getStatus = (email) =>
  fetch(`${BASE}/status?email=${encodeURIComponent(email)}`).then(handleResponse);

// ── Admin / Cases ─────────────────────────────────────────────────────────────
export const getCases = () => fetch(`${BASE}/cases`).then(handleResponse);
export const getCase = (id) => fetch(`${BASE}/cases/${id}`).then(handleResponse);
export const createCase = (data) =>
  fetch(`${BASE}/cases`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(handleResponse);
export const updateCase = (id, data) =>
  fetch(`${BASE}/cases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(handleResponse);

// ── Admin / AI ────────────────────────────────────────────────────────────────
export const analyzeCase = (caseId) =>
  fetch(`${BASE}/ai/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId }) }).then(handleResponse);

export async function streamLetter(caseId, onChunk) {
  const resp = await fetch(`${BASE}/ai/letter`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId }),
  });
  await readStream(resp, onChunk);
}

export async function streamChat(messages, caseId, onChunk) {
  const resp = await fetch(`${BASE}/ai/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, caseId }),
  });
  await readStream(resp, onChunk);
}
