// ── Anthropic API client ──────────────────────────────────────────────────────
const API_KEY = process.env.ANTHROPIC_API_KEY || "";

if (!API_KEY) {
  console.error("⚠️  ANTHROPIC_API_KEY not set — AI features will fail");
} else {
  console.log(`[STARTUP] Anthropic key loaded (${API_KEY.slice(0, 18)}…)`);
  // Ping to verify key + model
  (async () => {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 5, messages: [{ role: "user", content: "Hi" }] }),
      });
      const d = await r.json();
      if (d.type === "error") {
        console.error(`[STARTUP] ⚠️  API error: ${d.error?.message}`);
      } else {
        console.log("[STARTUP] ✅ Anthropic API verified");
      }
    } catch (err) {
      console.error("[STARTUP] ⚠️  Cannot reach Anthropic:", err.message);
    }
  })();
}

async function callAnthropic(body) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  return resp;
}

async function readSSEChunks(resp, onChunk) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const j = JSON.parse(line.slice(6));
        if (j.type === "content_block_delta" && j.delta?.text) {
          full += j.delta.text;
          onChunk(j.delta.text);
        }
      } catch {}
    }
  }
  return full;
}

module.exports = { callAnthropic, readSSEChunks };
