export type McpData = Record<string, unknown>;

type McpResponse = {
  result?: {
    structuredContent?: { data?: McpData };
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { message?: string };
};

export function parseMcpResponse(raw: string): McpResponse {
  const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
  const json = dataLine ? dataLine.slice(6) : raw;
  return JSON.parse(json) as McpResponse;
}

export class McpClient {
  private nextId = 1;

  constructor(
    private readonly endpoint = import.meta.env.VITE_MCP_ENDPOINT ?? "/mcp",
    private readonly userId = "video-demo",
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  async call<T extends McpData>(name: string, args: McpData = {}): Promise<T> {
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "MCP-Protocol-Version": "2025-11-25",
        "x-employee-user-id": this.userId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextId++,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });
    const payload = parseMcpResponse(await response.text());
    if (!response.ok || payload.error) throw new Error(payload.error?.message ?? `MCP request failed with ${response.status}.`);
    const data = payload.result?.structuredContent?.data;
    if (!data) throw new Error("The MCP response did not include structuredContent.data.");
    return data as T;
  }

  async resetDemo(): Promise<void> {
    const response = await this.fetcher("/demo/reset", { method: "POST" });
    if (!response.ok) throw new Error(`The demo scene could not be reset (${response.status}).`);
  }
}
