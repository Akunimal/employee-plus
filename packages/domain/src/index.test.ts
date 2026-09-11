import { describe, expect, it } from "vitest";
import { EmployeeError } from "@employee-plus/contracts";
import { EmployeeDomain, createFixtureStore } from "./index.js";

const userId = "user-alice";

describe("Employee+ home-service lifecycle", () => {
  it("returns a useful weekly brief from synthetic home data", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const brief = domain.getHomeBrief(userId);
    expect(brief.dueAssets).toHaveLength(1);
    expect(brief.recommendation).toContain("water heater");
  });

  it("requires explicit confirmation and preserves the prepared payload", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    expect(draft.requiresExplicitConfirmation).toBe(true);
    expect(draft.payloadHash).toHaveLength(64);
    const booking = domain.confirmBooking(userId, { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0001" });
    expect(booking.scheduledStart).toBe("2026-09-11T09:00:00.000Z");
    expect(booking.status).toBe("scheduled");
  });

  it("makes confirmation idempotent", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const input = { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0002" };
    expect(domain.confirmBooking(userId, input).bookingId).toBe(domain.confirmBooking(userId, input).bookingId);
  });

  it("rejects a confirmation from another user", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const draft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    expect(() => domain.confirmBooking("user-bob", { draftId: draft.draftId, confirmationToken: draft.confirmationToken, payloadHash: draft.payloadHash, idempotencyKey: "book-request-0003" })).toThrowError(EmployeeError);
  });

  it("changes only the requested appointment slot", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const bookingDraft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0004" });
    const changeDraft = domain.prepareBookingChange(userId, { bookingId: booking.bookingId, slotId: "slot_tomorrow_1300" });
    const changed = domain.confirmBookingChange(userId, { draftId: changeDraft.draftId, confirmationToken: changeDraft.confirmationToken, payloadHash: changeDraft.payloadHash, idempotencyKey: "change-request-0001" });
    expect(changed.scheduledStart).toBe("2026-09-11T13:00:00.000Z");
    expect(changed.optionId).toBe(booking.optionId);
    expect(changed.addressLabel).toBe(booking.addressLabel);
  });

  it("uses safe temporal language for a correlated Ring event", () => {
    const domain = new EmployeeDomain(createFixtureStore());
    const bookingDraft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0005" });
    const context = domain.correlateRingEvent(userId, { eventId: "ring-event-1", deviceId: "device-internal", eventType: "doorbell_press", occurredAt: booking.scheduledStart });
    expect(context.matchedBookingId).toBe(booking.bookingId);
    expect(context.message).toContain("can’t verify the person’s identity");
  });

  it("cancels only after explicit confirmation and records an audit event", () => {
    const store = createFixtureStore();
    const domain = new EmployeeDomain(store);
    const bookingDraft = domain.prepareBooking(userId, { assetId: "asset_water_heater", optionId: "option_northstar_standard", slotId: "slot_tomorrow_0900", addressLabel: "Home" });
    const booking = domain.confirmBooking(userId, { draftId: bookingDraft.draftId, confirmationToken: bookingDraft.confirmationToken, payloadHash: bookingDraft.payloadHash, idempotencyKey: "book-request-0006" });
    const cancelDraft = domain.prepareBookingCancellation(userId, { bookingId: booking.bookingId });
    expect(cancelDraft.requiresExplicitConfirmation).toBe(true);
    const cancelled = domain.confirmBookingCancellation(userId, { draftId: cancelDraft.draftId, confirmationToken: cancelDraft.confirmationToken, payloadHash: cancelDraft.payloadHash, idempotencyKey: "cancel-request-0001" });
    expect(cancelled.status).toBe("cancelled");
    expect(store.auditEvents.map((event) => event.action)).toContain("booking_cancelled");
  });
});
