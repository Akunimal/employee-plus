import { createServer } from "node:http";
import { EmployeeDomain, createDynamoStore, createFixtureStore } from "@employee-plus/domain";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { buildMcpHandler } from "./mcp.js";
import { createUserResolver } from "./auth.js";
import { parseRingWebhook, RingWebhookDeduplicator, verifyRingWebhookSignature } from "@employee-plus/adapters";

const production = process.env.NODE_ENV === "production";
const stateStore = production ? await createDynamoStore() : createFixtureStore();
const draftSecret = process.env.DRAFT_SECRET;
if (production && !draftSecret) throw new Error("DRAFT_SECRET is required in production.");
const domain = new EmployeeDomain(stateStore, draftSecret ?? "employee-plus-local-draft-secret");
const port = Number(process.env.PORT ?? 3000);
const ringEnabled = process.env.RING_ENABLED === "true" && process.env.RING_TEST_ACCOUNT_CONNECTED === "true";
const userResolver = createUserResolver();
const mcpHandler = buildMcpHandler(domain, ringEnabled, userResolver);
const mcpNodeHandler = toNodeHandler(mcpHandler);
const ringDedupe = new RingWebhookDeduplicator();
const MAX_MCP_REQUEST_BYTES = 1_000_000;
const configuredOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function writeJson(response: import("node:http").ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  response.end(JSON.stringify(body));
}

function validOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (configuredOrigins.has(origin)) return true;
  if (production) return false;
  try { const url = new URL(origin); return ["localhost", "127.0.0.1", "::1"].includes(url.hostname); }
  catch { return false; }
}

function requestPath(request: import("node:http").IncomingMessage) {
  return new URL(request.url ?? "/", "http://employee-plus.local").pathname;
}

function contentLengthExceedsLimit(request: import("node:http").IncomingMessage) {
  const value = request.headers["content-length"];
  if (!value || Array.isArray(value)) return false;
  const length = Number(value);
  return Number.isFinite(length) && length > MAX_MCP_REQUEST_BYTES;
}

function readBody(request: import("node:http").IncomingMessage, maxBytes = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => { body += chunk; if (Buffer.byteLength(body) > maxBytes) reject(new Error("Payload too large.")); });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function toAuthRequest(request: import("node:http").IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return new Request("http://employee-plus.local/mcp", { headers });
}

function writeAuthenticationRequired(response: import("node:http").ServerResponse) {
  response.writeHead(401, { "content-type": "application/json", "www-authenticate": 'Bearer realm="employee-plus"' });
  response.end(JSON.stringify({ code: "AUTHENTICATION_REQUIRED", message: "Authentication is required." }));
}

const server = createServer(async (request, response) => {
  const path = requestPath(request);

  if (path === "/health/live") {
    writeJson(response, 200, { status: "ok", service: "employee-plus" });
    return;
  }
  if (path === "/health/ready") {
    writeJson(response, 200, { status: "ready", persistence: production ? "dynamodb" : "fixture-store", authentication: production ? "cognito-jwt" : "fixture" });
    return;
  }
  if (path === "/privacy" || path === "/terms") {
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    });
    response.end(path === "/privacy" ? "Employee+ privacy notice — synthetic demo data only.\n" : "Employee+ terms — no payments, tax documents, or identity verification.\n");
    return;
  }
  if (path === "/mcp") {
    if (!validOrigin(request.headers.origin)) { writeJson(response, 403, { code: "INVALID_ORIGIN", message: "Origin is not allowed." }); return; }
    if (contentLengthExceedsLimit(request)) { writeJson(response, 413, { code: "PAYLOAD_TOO_LARGE", message: "Request payload is too large." }); return; }
    if (production) {
      try { await userResolver(toAuthRequest(request)); }
      catch { writeAuthenticationRequired(response); return; }
    }
    mcpNodeHandler(request, response);
    return;
  }
  if (path === "/webhooks/ring" && ringEnabled) {
    if (request.method !== "POST") { response.writeHead(405, { allow: "POST" }); response.end(); return; }
    const body = await readBody(request).catch(() => null);
    const secret = process.env.RING_WEBHOOK_SECRET;
    const signatureHeader = request.headers["x-ring-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader ?? "";
    if (!body || !secret || !verifyRingWebhookSignature(body, signature, secret)) { writeJson(response, 403, { code: "INVALID_RING_SIGNATURE", message: "Ring event signature is invalid." }); return; }
    try {
      const event = parseRingWebhook(body);
      if (!ringDedupe.accept(event.eventId)) { writeJson(response, 202, { accepted: true, duplicate: true }); return; }
      await domain.correlateRingEvent(process.env.RING_TEST_USER_ID ?? "demo-user", event);
      writeJson(response, 202, { accepted: true });
    } catch { writeJson(response, 400, { code: "INVALID_RING_EVENT", message: "Ring event payload is invalid." }); }
    return;
  }
  if (path === "/.well-known/oauth-protected-resource") {
    const host = request.headers.host;
    const cognitoIssuer = process.env.COGNITO_ISSUER;
    if (!host || !cognitoIssuer) {
      writeJson(response, 503, { code: "OAUTH_METADATA_NOT_CONFIGURED", message: "OAuth metadata is not configured." });
      return;
    }
    writeJson(response, 200, {
      resource: `https://${host}/mcp`,
      authorization_servers: [cognitoIssuer],
      scopes_supported: ["openid", "email", "employee/read", "employee/manage"],
    });
    return;
  }
  if (path === "/") {
    writeJson(response, 200, { name: "Employee+", version: "0.1.0", status: production ? "mcp-ready-production" : "mcp-ready-local", ringToolsPublished: ringEnabled, example: domain.getHomeBrief("demo-user") });
    return;
  }
  writeJson(response, 404, { code: "NOT_FOUND", message: "Route not found." });
});

/*
 * Keep the server bootstrap deliberately small. All route policy lives above so
 * the same executable is used by local smoke tests and the production image.
 */
server.listen(port, () => console.log(`Employee+ local server listening on http://localhost:${port}`));
