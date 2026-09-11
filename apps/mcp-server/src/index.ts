import { createServer } from "node:http";
import { EmployeeDomain, createFixtureStore } from "@employee-plus/domain";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { buildMcpHandler } from "./mcp.js";

const domain = new EmployeeDomain(createFixtureStore());
const port = Number(process.env.PORT ?? 3000);
const ringEnabled = process.env.RING_ENABLED === "true" && process.env.RING_TEST_ACCOUNT_CONNECTED === "true";
const mcpHandler = buildMcpHandler(domain, ringEnabled);
const mcpNodeHandler = toNodeHandler(mcpHandler);

function writeJson(response: import("node:http").ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function validOrigin(origin: string | undefined) {
  if (!origin) return true;
  try { const url = new URL(origin); return ["localhost", "127.0.0.1", "::1"].includes(url.hostname); }
  catch { return false; }
}

const server = createServer((request, response) => {
  if (request.url === "/health/live") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "employee-plus" }));
    return;
  }
  if (request.url === "/health/ready") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ready", persistence: "fixture-store" }));
    return;
  }
  if (request.url === "/privacy" || request.url === "/terms") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(request.url === "/privacy" ? "Employee+ privacy notice — synthetic demo data only.\n" : "Employee+ terms — no payments, tax documents, or identity verification.\n");
    return;
  }
  if (request.url === "/mcp") {
    if (!validOrigin(request.headers.origin)) { writeJson(response, 403, { code: "INVALID_ORIGIN", message: "Origin is not allowed." }); return; }
    mcpNodeHandler(request, response);
    return;
  }
  if (request.url === "/.well-known/oauth-protected-resource") {
    writeJson(response, 200, { resource: "https://employee-plus.example/mcp", authorization_servers: ["https://employee-plus.example/oauth2"] });
    return;
  }
  if (request.url === "/") {
    writeJson(response, 200, { name: "Employee+", version: "0.1.0", status: "mcp-ready-local", ringToolsPublished: ringEnabled, example: domain.getHomeBrief("demo-user") });
    return;
  }
  writeJson(response, 404, { code: "NOT_FOUND", message: "Route not found." });
});

server.listen(port, () => console.log(`Employee+ local server listening on http://localhost:${port}`));
