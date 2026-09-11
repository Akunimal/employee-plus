import { spawn } from "node:child_process";

const server = spawn(process.execPath, ["apps/mcp-server/dist/index.js"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "test", PORT: "3210", COGNITO_DOMAIN: "employee-plus-test.auth.us-east-2.amazoncognito.com" } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const request = async (body, headers = {}) => {
  const response = await fetch("http://127.0.0.1:3210/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25", "x-employee-user-id": "smoke-user", ...headers }, body: JSON.stringify(body) });
  const raw = await response.text();
  const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
  return { response, payload: JSON.parse(dataLine ? dataLine.slice(6) : raw) };
};

try {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { if ((await fetch("http://127.0.0.1:3210/health/live")).ok) break; } catch { await sleep(100); }
    if (attempt === 29) throw new Error("MCP server did not become healthy.");
  }
  const initialized = await request({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "employee-plus-smoke", version: "0.1.0" } } });
  if (initialized.payload.result?.protocolVersion !== "2025-11-25") throw new Error("MCP protocol negotiation failed.");
  const metadataResponse = await fetch("http://127.0.0.1:3210/.well-known/oauth-protected-resource");
  const metadata = await metadataResponse.json();
  if (metadataResponse.status !== 200 || metadata.resource !== "https://127.0.0.1:3210/mcp" || metadata.authorization_servers?.[0] !== "https://employee-plus-test.auth.us-east-2.amazoncognito.com") throw new Error("OAuth protected-resource metadata is not aligned.");
  const listed = await request({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const names = listed.payload.result.tools.map((tool) => tool.name);
  if (names.length !== 13 || !names.includes("confirm_booking") || !names.includes("confirm_booking_cancellation")) throw new Error(`Unexpected base tool registry: ${names.join(", ")}`);
  const brief = await request({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_home_brief", arguments: {} } });
  if (!brief.payload.result?.structuredContent?.data?.dueAssets?.length) throw new Error("Home brief did not return due assets.");
  const rejected = await request({ jsonrpc: "2.0", id: 4, method: "tools/list", params: {} }, { origin: "https://untrusted.example" });
  if (rejected.response.status !== 403) throw new Error(`Origin validation returned ${rejected.response.status}.`);
  console.log(JSON.stringify({ status: "ok", protocol: initialized.payload.result.protocolVersion, toolCount: names.length, originValidation: "ok", oauthMetadata: "ok" }));
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
}
