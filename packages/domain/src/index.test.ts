import { describe, expect, it } from "vitest";
import { EmployeeError } from "@employee-plus/contracts";
import { EmployeeDomain, createDynamoStore, createFixtureStore } from "./index.js";

const userId = "user-alice";

describe("Employee+ home-service lifecycle", () => {
  it("returns a useful weekly brief from synthetic home data", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const brief = domain.getHomeBrief(userId);
    expect(brief.dueAssets).toHaveLength(1);
    expect(brief.recommendation).toContain("water heater");
  });

  it("returns an up-to-date brief when no asset is due", () => {
    const store = createFixtureStore();
    for (const asset of store.assets.values()) asset.maintenanceDue = false;
    const brief = new EmployeeDomain(store).getHomeBrief(userId);
    expect(brief.dueAssets).toHaveLength(0);
    expect(brief.recommendation).toContain("up to date");
  });

  it("lists assets, searches options, checks availability and compares quotes", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    expect(domain.listHomeAssets()).toHaveLength(2);
    expect(domain.searchServiceOptions({ serviceType: "repair", maxResults: 1 })).toHaveLength(1);
    expect(domain.checkServiceAvailability("option_northstar_standard")).toHaveLength(3);
    expect(domain.compareQuotes(["option_northstar_priority", "option_northstar_standard"]).map((quote) => quote.price.amount)).toEqual([129, 189]);
    expect(() => domain.compareQuotes([])).toThrowError(EmployeeError);
    expect(() => domain.compareQuotes(["missing-option"])).toThrowError(EmployeeError);
  });

  it("requires explicit confirmation and preserves the prepared payload", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    expect(draft.requiresExplicitConfirmation).toBe(true);
    expect(draft.payloadHash).toHaveLength(64);
    const booking = await domain.confirmBooking(userId, { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0001" });
    expect(booking.scheduledStart).toBe("2026-09-11T09:00:00.000Z");
    expect(booking.status).toBe("scheduled");
  });

  it("rejects a booking for an unavailable asset", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    await expect(domain.prepareBooking(userId, { assetId: "asset_missing", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" })).rejects.toThrowError(EmployeeError);
  });

  it("makes confirmation idempotent", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const input = { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0002" };
    const first = await domain.confirmBooking(userId, input);
    const second = await domain.confirmBooking(userId, input);
    expect(first.bookingId).toBe(second.bookingId);
  });

  it("rejects a confirmation from another user", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    await expect(domain.confirmBooking("user-bob", { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0003" })).rejects.toThrowError(EmployeeError);
  });

  it("changes only the requested appointment slot", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const bookingDraft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = await domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0004" });
    const changeDraft = await domain.prepareBookingChange(userId, { bookingId: booking.bookingId, slotId: "slot_tomorrow_1300" });
    const changed = await domain.confirmBookingChange(userId, { draftId: changeDraft.draftId, confirmationToken: changeDraft.confirmationToken, payloadHash: changeDraft.payloadHash, idempotencyKey: "change-request-0001" });
    expect(changed.scheduledStart).toBe("2026-09-11T13:00:00.000Z");
    expect(changed.optionId).toBe(booking.optionId);
    expect(changed.addressLabel).toBe(booking.addressLabel);
  });

  it("uses safe temporal language for a correlated Ring event", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const bookingDraft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = await domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0005" });
    const context = await domain.correlateRingEvent(userId, { eventId: "ring-event-1", deviceId: "device-internal", eventType: "doorbell_press", occurredAt: booking.scheduledStart });
    expect(context.matchedBookingId).toBe(booking.bookingId);
    expect(context.message).toContain("can’t verify the person’s identity");
    expect(domain.getRingArrivalContext(userId, "ring-event-1")).toEqual(context);
    const unmatched = await domain.correlateRingEvent(userId, { eventId: "ring-event-2", deviceId: "device-internal", eventType: "motion", occurredAt: "2026-09-20T09:00:00.000Z" });
    expect(unmatched.matchedBookingId).toBeNull();
    expect(unmatched.message).toContain("does not match");
  });

  it("cancels only after explicit confirmation and records an audit event", async () => {
    const store = createFixtureStore();
    const domain = new EmployeeDomain(store);
    const bookingDraft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = await domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0006" });
    const cancelDraft = await domain.prepareBookingCancellation(userId, { bookingId: booking.bookingId });
    expect(cancelDraft.requiresExplicitConfirmation).toBe(true);
    const cancelled = await domain.confirmBookingCancellation(userId, { draftId: cancelDraft.draftId, confirmationToken: cancelDraft.confirmationToken, payloadHash: cancelDraft.payloadHash, idempotencyKey: "cancel-request-0001" });
    expect(cancelled.status).toBe("cancelled");
    expect(store.auditEvents.map((event) => event.action)).toContain("booking_cancelled");
    expect(() => domain.getRingArrivalContext(userId, "missing-ring-event")).toThrowError(EmployeeError);
    await expect(domain.prepareBookingCancellation(userId, { bookingId: booking.bookingId })).rejects.toThrowError(EmployeeError);
  });

  it("returns status and creates a simulated service document", async () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = await domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = await domain.confirmBooking(userId, { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-doc1" });
    expect(domain.getServiceStatus(userId, booking.bookingId)).toEqual(booking);
    const document = await domain.createSimulatedDocument(userId, booking.bookingId);
    expect(document.simulated).toBe(true);
    expect(document.content).toContain("SIMULATED");
    expect(domain.getServiceDocument(userId, document.documentId)).toEqual(document);
    expect(() => domain.getServiceDocument(userId, "document_missing")).toThrowError(EmployeeError);
  });

  it("hydrates dynamic state from DynamoDB and writes a complete snapshot", async () => {
    const booking = { bookingId: "booking_existing", userId, assetId: "asset_water_heater", optionId: "option_northstar_standard", providerName: "Northstar Home Care", addressLabel: "Home", scheduledStart: "2026-09-11T09:00:00.000Z", scheduledEnd: "2026-09-11T10:30:00.000Z", status: "scheduled", version: 1, createdAt: "2026-09-10T12:00:00.000Z", updatedAt: "2026-09-10T12:00:00.000Z" };
    const stored = [
      { pk: "EMPLOYEE_PLUS_STATE", sk: "booking#booking_existing", entityType: "booking", value: booking },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "document#document_existing", entityType: "document", value: { documentId: "document_existing", bookingId: booking.bookingId, kind: "invoice", label: "Simulated service invoice", content: "SIMULATED", simulated: true, createdAt: "2026-09-10T12:00:00.000Z" } },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "draft#draft_existing", entityType: "draft", value: { draftId: "draft_existing", userId, operation: "booking", payloadHash: "a".repeat(64), expiresAt: "2026-09-11T12:00:00.000Z", confirmationToken: "b".repeat(64), summary: "Book it", requiresExplicitConfirmation: true, payload: {} } },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "idempotency#user-alice:request-existing", entityType: "idempotency", value: { key: "user-alice:request-existing", value: booking } },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "ring-event#ring-existing", entityType: "ring-event", value: { eventId: "ring-existing", deviceId: "device-internal", eventType: "motion", occurredAt: "2026-09-11T09:00:00.000Z" } },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "ring-context#user-alice:ring-existing", entityType: "ring-context", value: { eventId: "ring-existing", eventType: "motion", occurredAt: "2026-09-11T09:00:00.000Z", matchedBookingId: booking.bookingId, message: "Activity matches the service window." } },
      { pk: "EMPLOYEE_PLUS_STATE", sk: "audit#audit-existing", entityType: "audit", value: { eventId: "audit-existing", userId, action: "booking_created", entityId: booking.bookingId, occurredAt: "2026-09-10T12:00:00.000Z" } },
    ];
    const batches: unknown[] = [];
    let batchAttempt = 0;
    const fakeClient = {
      send: async (command: { input: Record<string, any> }) => {
        if (command.input.KeyConditionExpression) return { Items: stored };
        batches.push(command.input.RequestItems);
        batchAttempt += 1;
        return batchAttempt === 1 ? { UnprocessedItems: command.input.RequestItems } : { UnprocessedItems: {} };
      },
    } as unknown as import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient;

    const store = await createDynamoStore({ tableName: "employee-state", region: "us-east-2", client: fakeClient });
    expect(store.bookings.get(booking.bookingId)?.userId).toBe(userId);
    expect(store.documents.has("document_existing")).toBe(true);
    expect(store.drafts.has("draft_existing")).toBe(true);
    expect(store.idempotency.has("user-alice:request-existing")).toBe(true);
    expect(store.ringEvents.has("ring-existing")).toBe(true);
    expect(store.ringContexts.has("user-alice:ring-existing")).toBe(true);
    expect(store.auditEvents).toHaveLength(1);

    store.bookings.delete(booking.bookingId);
    await store.persist?.();
    expect(batches).toHaveLength(2);
    expect(JSON.stringify(batches[0])).toContain("booking#booking_existing");
  });

  it("rejects incomplete DynamoDB configuration", async () => {
    await expect(createDynamoStore({ region: "us-east-2" })).rejects.toThrow("DynamoDB production configuration is incomplete.");
    await expect(createDynamoStore({ tableName: "employee-state" })).rejects.toThrow("DynamoDB production configuration is incomplete.");
  });
});
