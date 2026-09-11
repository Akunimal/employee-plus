const endpoint = (process.env.EMPLOYEE_PLUS_ENDPOINT ?? "").replace(/\/$/, "");

if (!endpoint || !/^https:\/\//.test(endpoint)) {
  console.error("EMPLOYEE_PLUS_ENDPOINT must be an HTTPS URL.");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(`${endpoint}${path}`, { ...init, signal: AbortSignal.timeout(20_000) });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* plain text is valid for diagnostics */ }
  return { status: response.status, body };
}

const checks = [];
for (const path of ["/health/live", "/health/ready", "/.well-known/oauth-protected-resource"]) {
  const result = await request(path);
  checks.push({ path, status: result.status, passed: result.status === 200 });
}

const invalidOrigin = await request("/mcp", { headers: { Origin: "https://invalid-origin.example" } });
checks.push({ path: "/mcp invalid origin", status: invalidOrigin.status, passed: invalidOrigin.status === 403 });

const anonymous = await request("/mcp", {
  method: "POST",
  headers: { "content-type": "application/json", "mcp-protocol-version": "2025-11-25" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "remote-smoke", version: "1.0.0" } },
  }),
});
checks.push({ path: "/mcp anonymous initialize", status: anonymous.status, passed: anonymous.status === 401 });

const result = { endpoint, checks, passed: checks.every((check) => check.passed) };
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
