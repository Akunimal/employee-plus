import { describe, expect, it } from "vitest";
import { McpClient, parseMcpResponse } from "./mcp-client";

describe("video demo MCP client", () => {
  it("parses streamable HTTP data events", () => {
    const payload = parseMcpResponse('event: message\ndata: {"result":{"structuredContent":{"data":{"ok":true}}}}\n\n');
    expect(payload.result?.structuredContent?.data).toEqual({ ok: true });
  });

  it("calls a real MCP tool with the video-demo identity", async () => {
    const calls: RequestInit[] = [];
    const fetcher: typeof fetch = async (_input, init) => {
      calls.push(init ?? {});
      return new Response('data: {"result":{"structuredContent":{"data":{"recommendation":"Ready"}}}}\n\n', { status: 200 });
    };
    const client = new McpClient("/mcp", "video-demo", fetcher);
    await expect(client.call("get_home_brief")).resolves.toEqual({ recommendation: "Ready" });
    expect(calls[0].headers).toMatchObject({ "x-employee-user-id": "video-demo", "MCP-Protocol-Version": "2025-11-25" });
    expect(JSON.parse(String(calls[0].body))).toMatchObject({ method: "tools/call", params: { name: "get_home_brief" } });
  });

  it("surfaces MCP errors without exposing transport details", async () => {
    const fetcher: typeof fetch = async () => new Response('data: {"error":{"message":"That option is not available."}}\n\n', { status: 200 });
    await expect(new McpClient("/mcp", "video-demo", fetcher).call("check_service_availability", { optionId: "bad" })).rejects.toThrow("That option is not available.");
  });
});
