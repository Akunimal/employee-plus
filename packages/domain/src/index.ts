import { createHash, createHmac, randomUUID } from "node:crypto";
import { EmployeeError } from "@employee-plus/contracts";
import type {
  AvailabilitySlot,
  Booking,
  ConfirmBookingChangeInput,
  ConfirmBookingInput,
  Draft,
  HomeAsset,
  Money,
  PrepareBookingChangeInput,
  PrepareBookingInput,
  QuoteSearchInput,
  RingArrivalContext,
  ServiceDocument,
  ServiceOption,
} from "@employee-plus/contracts";

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const money = (amount: number): Money => ({ amount, currency: "USD" });

export interface DomainStore {
  assets: Map<string, HomeAsset>;
  options: Map<string, ServiceOption>;
  slots: Map<string, AvailabilitySlot>;
  bookings: Map<string, Booking>;
  documents: Map<string, ServiceDocument>;
  drafts: Map<string, Draft>;
  idempotency: Map<string, unknown>;
  ringEvents: Map<string, RingEvent>;
  ringContexts: Map<string, RingArrivalContext>;
}

export interface RingEvent {
  eventId: string;
  deviceId: string;
  eventType: "doorbell_press" | "motion";
  occurredAt: string;
}

export function createFixtureStore(): DomainStore {
  const timestamp = "2026-09-10T12:00:00.000Z";
  const assets: HomeAsset[] = [
    { assetId: "asset_water_heater", type: "water_heater", name: "Main water heater", location: "Utility room", maintenanceDue: true, lastServicedAt: "2025-03-14T14:00:00.000Z" },
    { assetId: "asset_hvac", type: "hvac", name: "Central air system", location: "Attic", maintenanceDue: false, lastServicedAt: "2026-04-20T14:00:00.000Z" },
  ];
  const options: ServiceOption[] = [
    { optionId: "option_northstar_standard", serviceType: "repair", title: "Water heater diagnostic and repair", providerName: "Northstar Home Care", rating: 4.8, price: money(129), durationMinutes: 90, warrantyMonths: 6, description: "Diagnostic visit with common-part repair allowance." },
    { optionId: "option_northstar_priority", serviceType: "repair", title: "Water heater priority repair", providerName: "Northstar Home Care", rating: 4.9, price: money(189), durationMinutes: 90, warrantyMonths: 12, description: "Priority technician with extended repair warranty." },
    { optionId: "option_cedar_maintenance", serviceType: "maintenance", title: "Seasonal HVAC maintenance", providerName: "Cedar & Co.", rating: 4.6, price: money(99), durationMinutes: 60, warrantyMonths: 3, description: "Seasonal inspection, filter check and performance report." },
  ];
  const slots: AvailabilitySlot[] = [
    { slotId: "slot_tomorrow_0900", startsAt: "2026-09-11T09:00:00.000Z", endsAt: "2026-09-11T10:30:00.000Z", timezone: "America/New_York" },
    { slotId: "slot_tomorrow_1300", startsAt: "2026-09-11T13:00:00.000Z", endsAt: "2026-09-11T14:30:00.000Z", timezone: "America/New_York" },
    { slotId: "slot_friday_1000", startsAt: "2026-09-12T10:00:00.000Z", endsAt: "2026-09-12T11:30:00.000Z", timezone: "America/New_York" },
  ];
  return { assets: new Map(assets.map((item) => [item.assetId, item])), options: new Map(options.map((item) => [item.optionId, item])), slots: new Map(slots.map((item) => [item.slotId, item])), bookings: new Map(), documents: new Map(), drafts: new Map(), idempotency: new Map(), ringEvents: new Map(), ringContexts: new Map() };
}

export class EmployeeDomain {
  constructor(private readonly store: DomainStore, private readonly draftSecret = "employee-plus-local-draft-secret") {}

  getHomeBrief(userId: string) {
    const due = [...this.store.assets.values()].filter((asset) => asset.maintenanceDue);
    const bookings = [...this.store.bookings.values()].filter((booking) => booking.userId === userId && booking.status !== "cancelled");
    return { userId, generatedAt: nowIso(), dueAssets: due, upcomingBookings: bookings, recommendation: due.length ? "Your water heater needs attention this week." : "Your home maintenance is up to date." };
  }

  listHomeAssets() { return [...this.store.assets.values()]; }

  searchServiceOptions(input: QuoteSearchInput) {
    return [...this.store.options.values()].filter((option) => option.serviceType === input.serviceType).slice(0, input.maxResults);
  }

  checkServiceAvailability(optionId: string) {
    this.requireOption(optionId);
    return [...this.store.slots.values()];
  }

  compareQuotes(optionIds: string[]) {
    if (optionIds.length < 1 || optionIds.length > 5) throw new EmployeeError("INVALID_INPUT", "Choose between one and five service options.");
    return optionIds.map((optionId) => this.requireOption(optionId)).sort((a, b) => a.price.amount - b.price.amount);
  }

  prepareBooking(userId: string, input: PrepareBookingInput): Draft {
    const asset = this.store.assets.get(input.assetId);
    const option = this.requireOption(input.optionId);
    const slot = this.requireSlot(input.slotId);
    if (!asset) throw new EmployeeError("NOT_FOUND", "That home asset is not available.");
    const payload = { assetId: asset.assetId, optionId: option.optionId, slotId: slot.slotId, addressLabel: input.addressLabel };
    return this.saveDraft(userId, "booking", payload, `Book ${option.title} with ${option.providerName} for ${slot.startsAt}. Price ${option.price.amount} ${option.price.currency}.`);
  }

  confirmBooking(userId: string, input: ConfirmBookingInput): Booking {
    const existing = this.store.idempotency.get(`${userId}:${input.idempotencyKey}`);
    if (existing) return existing as Booking;
    const draft = this.validateDraft(userId, input, "booking");
    const payload = draft.payload as { assetId: string; optionId: string; slotId: string; addressLabel: string };
    const option = this.requireOption(payload.optionId);
    const slot = this.requireSlot(payload.slotId);
    const timestamp = nowIso();
    const booking: Booking = { bookingId: id("booking"), userId, assetId: payload.assetId, optionId: option.optionId, providerName: option.providerName, addressLabel: payload.addressLabel, scheduledStart: slot.startsAt, scheduledEnd: slot.endsAt, status: "scheduled", version: 1, createdAt: timestamp, updatedAt: timestamp };
    this.store.bookings.set(booking.bookingId, booking);
    this.store.idempotency.set(`${userId}:${input.idempotencyKey}`, booking);
    this.store.drafts.delete(draft.draftId);
    return booking;
  }

  prepareBookingChange(userId: string, input: PrepareBookingChangeInput): Draft {
    const booking = this.requireBooking(userId, input.bookingId);
    const slot = this.requireSlot(input.slotId);
    return this.saveDraft(userId, "booking_change", { bookingId: booking.bookingId, slotId: slot.slotId }, `Move your ${booking.providerName} visit to ${slot.startsAt}.` , booking.version);
  }

  confirmBookingChange(userId: string, input: ConfirmBookingChangeInput): Booking {
    const existing = this.store.idempotency.get(`${userId}:${input.idempotencyKey}`);
    if (existing) return existing as Booking;
    const draft = this.validateDraft(userId, input, "booking_change");
    const payload = draft.payload as { bookingId: string; slotId: string };
    const booking = this.requireBooking(userId, payload.bookingId);
    if (booking.version !== draft.expectedVersion) throw new EmployeeError("CONFLICT", "The appointment changed while you were confirming it.");
    const slot = this.requireSlot(payload.slotId);
    const changed: Booking = { ...booking, scheduledStart: slot.startsAt, scheduledEnd: slot.endsAt, status: "rescheduled", version: booking.version + 1, updatedAt: nowIso() };
    this.store.bookings.set(booking.bookingId, changed);
    this.store.idempotency.set(`${userId}:${input.idempotencyKey}`, changed);
    this.store.drafts.delete(draft.draftId);
    return changed;
  }

  getServiceStatus(userId: string, bookingId: string) { return this.requireBooking(userId, bookingId); }

  getServiceDocument(userId: string, documentId: string) {
    const document = this.store.documents.get(documentId);
    if (!document) throw new EmployeeError("NOT_FOUND", "That service document was not found.");
    this.requireBooking(userId, document.bookingId);
    return document;
  }

  createSimulatedDocument(userId: string, bookingId: string): ServiceDocument {
    const booking = this.requireBooking(userId, bookingId);
    const document: ServiceDocument = { documentId: id("document"), bookingId, kind: "invoice", label: "Simulated service invoice", content: `SIMULATED — NOT A TAX DOCUMENT\nProvider: ${booking.providerName}\nBooking: ${booking.bookingId}`, simulated: true, createdAt: nowIso() };
    this.store.documents.set(document.documentId, document);
    return document;
  }

  correlateRingEvent(userId: string, event: RingEvent): RingArrivalContext {
    this.store.ringEvents.set(event.eventId, event);
    const eventTime = Date.parse(event.occurredAt);
    const booking = [...this.store.bookings.values()].find((candidate) => candidate.userId === userId && candidate.status !== "cancelled" && Math.abs(Date.parse(candidate.scheduledStart) - eventTime) <= 30 * 60 * 1000);
    const context: RingArrivalContext = { eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, matchedBookingId: booking?.bookingId ?? null, message: booking ? `Your Ring detected activity during the scheduled service window. A ${booking.providerName} visit is expected now, but I can’t verify the person’s identity.` : "Your Ring detected activity, but it does not match a scheduled service window." };
    this.store.ringContexts.set(`${userId}:${event.eventId}`, context);
    return context;
  }

  getRingArrivalContext(userId: string, eventId: string) { const context = this.store.ringContexts.get(`${userId}:${eventId}`); if (!context) throw new EmployeeError("NOT_FOUND", "That Ring event was not found."); return context; }

  private saveDraft(userId: string, operation: Draft["operation"], payload: Record<string, unknown>, summary: string, expectedVersion?: number): Draft {
    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const draftId = id("draft");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const confirmationToken = createHmac("sha256", this.draftSecret).update(`${userId}:${draftId}:${payloadHash}`).digest("hex");
    const draft: Draft = { draftId, userId, operation, payloadHash, expectedVersion, expiresAt, confirmationToken, summary, requiresExplicitConfirmation: true, payload };
    this.store.drafts.set(draftId, draft);
    return draft;
  }

  private validateDraft(userId: string, input: ConfirmBookingInput, operation: Draft["operation"]): Draft {
    const draft = this.store.drafts.get(input.draftId);
    if (!draft || draft.userId !== userId || draft.operation !== operation) throw new EmployeeError("INVALID_CONFIRMATION", "That confirmation is not valid for this account.");
    if (Date.parse(draft.expiresAt) <= Date.now()) throw new EmployeeError("EXPIRED_DRAFT", "That confirmation expired. Please prepare the change again.");
    if (draft.payloadHash !== input.payloadHash || draft.confirmationToken !== input.confirmationToken) throw new EmployeeError("INVALID_CONFIRMATION", "The confirmation details do not match the prepared change.");
    return draft;
  }

  private requireOption(optionId: string) { const option = this.store.options.get(optionId); if (!option) throw new EmployeeError("NOT_FOUND", "That service option is not available."); return option; }
  private requireSlot(slotId: string) { const slot = this.store.slots.get(slotId); if (!slot) throw new EmployeeError("NOT_FOUND", "That appointment time is not available."); return slot; }
  private requireBooking(userId: string, bookingId: string) { const booking = this.store.bookings.get(bookingId); if (!booking || booking.userId !== userId) throw new EmployeeError("NOT_FOUND", "That service appointment was not found."); return booking; }
}
