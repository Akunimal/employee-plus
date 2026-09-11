import { createHash } from "node:crypto";
import { z } from "zod";
import { createMcpHandler, McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import {
  ConfirmBookingChangeInputSchema,
  ConfirmBookingInputSchema,
  PrepareBookingChangeInputSchema,
  PrepareBookingInputSchema,
  QuoteSearchInputSchema,
} from "@employee-plus/contracts";
import type { EmployeeDomain } from "@employee-plus/domain";

const jsonOutput = z.object({
  text: z.string(),
  data: z.record(z.string(), z.unknown()),
});

const toolResult = (text: string, data: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent: { text, data },
});

const spokenError = (error: unknown) => error instanceof Error ? error.message : "Employee+ could not complete that request.";

function userIdFromRequest(request: Request | undefined): string {
  const userId = request?.headers.get("x-employee-user-id");
  if (userId && /^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return userId;
  if (process.env.NODE_ENV === "production") throw new Error("Authentication is required.");
  return "demo-user";
}

export function buildMcpHandler(domain: EmployeeDomain, ringEnabled = false) {
  return createMcpHandler((context) => {
    const userId = userIdFromRequest(context.requestInfo);
    const server = new McpServer({ name: "employee-plus", version: "0.1.0" });

    server.registerTool("get_home_brief", {
      title: "Get home brief",
      description: "Summarize maintenance that needs attention and upcoming service visits for the consumer's home.",
      inputSchema: z.object({}),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async () => {
      try { const data = domain.getHomeBrief(userId); return toolResult(data.recommendation, data); }
      catch (error) { return toolResult(spokenError(error), { error: "DEPENDENCY_FAILURE" }); }
    });

    server.registerTool("list_home_assets", {
      title: "List home assets",
      description: "List the consumer's registered home systems and maintenance state.",
      inputSchema: z.object({}),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async () => toolResult("Here are the systems registered for your home.", { assets: domain.listHomeAssets() }));

    server.registerTool("search_service_options", {
      title: "Search service options",
      description: "Find up to five synthetic service options for a home maintenance need.",
      inputSchema: QuoteSearchInputSchema,
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input) => toolResult(`I found ${domain.searchServiceOptions(input).length} service options.`, { options: domain.searchServiceOptions(input) }));

    server.registerTool("check_service_availability", {
      title: "Check service availability",
      description: "Show available appointment windows for one service option.",
      inputSchema: z.object({ optionId: z.string() }),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ optionId }) => toolResult("These appointment windows are available.", { slots: domain.checkServiceAvailability(optionId) }));

    server.registerTool("compare_quotes", {
      title: "Compare quotes",
      description: "Compare one to five service quotes by price, rating, warranty and duration.",
      inputSchema: z.object({ optionIds: z.array(z.string()).min(1).max(5) }),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ optionIds }) => toolResult("Here is the comparison, ordered from lowest price.", { options: domain.compareQuotes(optionIds) }));

    server.registerTool("prepare_booking", {
      title: "Prepare service booking",
      description: "Prepare a service booking for explicit consumer confirmation. This never books by itself.",
      inputSchema: PrepareBookingInputSchema,
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input) => { const draft = domain.prepareBooking(userId, input); return toolResult(`${draft.summary} Please explicitly confirm if you want me to book it.`, { draft }); });

    server.registerTool("confirm_booking", {
      title: "Confirm service booking",
      description: "Book a previously prepared service only after explicit consumer confirmation.",
      inputSchema: ConfirmBookingInputSchema,
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input) => { const booking = domain.confirmBooking(userId, input); return toolResult(`Your ${booking.providerName} visit is booked for ${booking.scheduledStart}.`, { booking }); });

    server.registerTool("prepare_booking_change", {
      title: "Prepare appointment change",
      description: "Prepare a date change while preserving every other appointment parameter.",
      inputSchema: PrepareBookingChangeInputSchema,
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input) => { const draft = domain.prepareBookingChange(userId, input); return toolResult(`${draft.summary} Please explicitly confirm if you want me to move it.`, { draft }); });

    server.registerTool("confirm_booking_change", {
      title: "Confirm appointment change",
      description: "Apply a previously prepared appointment date change after explicit confirmation.",
      inputSchema: ConfirmBookingChangeInputSchema,
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async (input) => { const booking = domain.confirmBookingChange(userId, input); return toolResult(`Your visit is now scheduled for ${booking.scheduledStart}.`, { booking }); });

    server.registerTool("get_service_status", {
      title: "Get service status",
      description: "Read the status of a consumer service appointment.",
      inputSchema: z.object({ bookingId: z.string() }),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ bookingId }) => { const booking = domain.getServiceStatus(userId, bookingId); return toolResult(`Your ${booking.providerName} visit is ${booking.status}.`, { booking }); });

    server.registerTool("get_service_document", {
      title: "Get service document",
      description: "Retrieve a simulated service document. It is not a tax document.",
      inputSchema: z.object({ documentId: z.string() }),
      outputSchema: jsonOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ documentId }) => { const document = domain.getServiceDocument(userId, documentId); return toolResult("Here is your simulated service document. It is not a tax document.", { document }); });

    server.registerResource("home-brief", "employee://me/home-brief", { title: "Employee+ home brief", mimeType: "application/json" }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(domain.getHomeBrief(userId)) }] }));
    server.registerResource("home-care-board", "ui://employee/home-care-board", { title: "Employee+ Home Care Board", mimeType: "text/html;profile=mcp-app" }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/html;profile=mcp-app", text: "<main><h1>Employee+ Home Care Board</h1><p>Ask Employee Plus what your home needs this week.</p></main>" }] }));
    server.registerResource("booking", new ResourceTemplate("employee://bookings/{bookingId}", { list: undefined }), { title: "Employee+ booking", mimeType: "application/json" }, async (uri, variables) => { const booking = domain.getServiceStatus(userId, String(variables.bookingId)); return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(booking) }] }; });
    server.registerResource("document", new ResourceTemplate("employee://documents/{documentId}", { list: undefined }), { title: "Employee+ service document", mimeType: "application/json" }, async (uri, variables) => { const document = domain.getServiceDocument(userId, String(variables.documentId)); return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(document) }] }; });

    if (ringEnabled) {
      server.registerTool("get_service_arrival_context", {
        title: "Get service arrival context",
        description: "Explain whether a validated Ring event is temporally related to a scheduled service visit without claiming identity.",
        inputSchema: z.object({ eventId: z.string() }),
        outputSchema: jsonOutput,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      }, async ({ eventId }) => toolResult("I can provide timing context, but I cannot verify who is at the door.", { eventId }));
      server.registerResource("arrival", new ResourceTemplate("employee://arrivals/{eventId}", { list: undefined }), { title: "Employee+ arrival context", mimeType: "application/json" }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ message: "Arrival context is available only for validated Ring events." }) }] }));
    }

    return server;
  }, { legacy: "stateless", responseMode: "auto", onerror: (error) => console.error("MCP request failed", error) });
}

export function payloadHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
