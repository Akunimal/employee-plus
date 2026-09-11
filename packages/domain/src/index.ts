import { createHash, createHmac, randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { EmployeeError } from "@employee-plus/contracts";
import type {
  AvailabilitySlot,
  Booking,
  ConfirmBookingChangeInput,
  ConfirmBookingCancellationInput,
  ConfirmBookingInput,
  Draft,
  HomeAsset,
  Money,
  PrepareBookingChangeInput,
  PrepareBookingCancellationInput,
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
  auditEvents: AuditEvent[];
  persist?: () => Promise<void>;
}

export interface RingEvent {
  eventId: string;
  deviceId: string;
  eventType: "doorbell_press" | "motion";
  occurredAt: string;
}

export interface AuditEvent {
  eventId: string;
  userId: string;
  action: "booking_created" | "booking_rescheduled" | "booking_cancelled" | "document_created" | "ring_correlated";
  entityId: string;
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
  return { assets: new Map(assets.map((item) => [item.assetId, item])), options: new Map(options.map((item) => [item.optionId, item])), slots: new Map(slots.map((item) => [item.slotId, item])), bookings: new Map(), documents: new Map(), drafts: new Map(), idempotency: new Map(), ringEvents: new Map(), ringContexts: new Map(), auditEvents: [] };
}

const DYNAMO_STATE_PK = "EMPLOYEE_PLUS_STATE";
type StoredStateItem = { pk: string; sk: string; entityType: string; value: unknown };

function snapshotState(store: DomainStore): StoredStateItem[] {
  const items: StoredStateItem[] = [];
  for (const [key, value] of store.bookings) items.push({ pk: DYNAMO_STATE_PK, sk: `booking#${key}`, entityType: "booking", value });
  for (const [key, value] of store.documents) items.push({ pk: DYNAMO_STATE_PK, sk: `document#${key}`, entityType: "document", value });
  for (const [key, value] of store.drafts) items.push({ pk: DYNAMO_STATE_PK, sk: `draft#${key}`, entityType: "draft", value });
  for (const [key, value] of store.idempotency) items.push({ pk: DYNAMO_STATE_PK, sk: `idempotency#${key}`, entityType: "idempotency", value: { key, value } });
  for (const [key, value] of store.ringEvents) items.push({ pk: DYNAMO_STATE_PK, sk: `ring-event#${key}`, entityType: "ring-event", value });
  for (const [key, value] of store.ringContexts) items.push({ pk: DYNAMO_STATE_PK, sk: `ring-context#${key}`, entityType: "ring-context", value });
  for (const value of store.auditEvents) items.push({ pk: DYNAMO_STATE_PK, sk: `audit#${value.eventId}`, entityType: "audit", value });
  return items;
}

async function queryState(client: DynamoDBDocumentClient, tableName: string): Promise<StoredStateItem[]> {
  const items: StoredStateItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": DYNAMO_STATE_PK },
      ExclusiveStartKey: exclusiveStartKey,
    }));
    items.push(...((page.Items ?? []) as StoredStateItem[]));
    exclusiveStartKey = page.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);
  return items;
}

async function batchWrite(client: DynamoDBDocumentClient, tableName: string, requests: Array<{ PutRequest?: { Item: StoredStateItem }; DeleteRequest?: { Key: { pk: string; sk: string } } }>) {
  for (let offset = 0; offset < requests.length; offset += 25) {
    let pending = requests.slice(offset, offset + 25);
    for (let attempt = 0; pending.length > 0 && attempt < 6; attempt += 1) {
      const response = await client.send(new BatchWriteCommand({ RequestItems: { [tableName]: pending } }));
      pending = (response.UnprocessedItems?.[tableName] ?? []) as typeof pending;
      if (pending.length > 0) await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
    }
    if (pending.length > 0) throw new Error("DynamoDB did not accept the complete Employee+ state batch.");
  }
}

export async function createDynamoStore(options: { tableName?: string; region?: string; client?: DynamoDBDocumentClient } = {}): Promise<DomainStore> {
  const tableName = options.tableName ?? process.env.STATE_TABLE_NAME;
  const region = options.region ?? process.env.AWS_REGION;
  if (!tableName || !region) throw new Error("DynamoDB production configuration is incomplete.");
  const client = options.client ?? DynamoDBDocumentClient.from(new DynamoDBClient({ region, maxAttempts: 5 }));
  const store = createFixtureStore();
  const existing = await queryState(client, tableName);
  for (const item of existing) {
    if (!item || item.pk !== DYNAMO_STATE_PK || !item.entityType || !item.value) continue;
    const value = item.value as Record<string, unknown>;
    switch (item.entityType) {
      case "booking": store.bookings.set(String(value.bookingId), value as unknown as Booking); break;
      case "document": store.documents.set(String(value.documentId), value as unknown as ServiceDocument); break;
      case "draft": store.drafts.set(String(value.draftId), value as unknown as Draft); break;
      case "idempotency": store.idempotency.set(String(value.key), value.value); break;
      case "ring-event": store.ringEvents.set(String(value.eventId), value as unknown as RingEvent); break;
      case "ring-context": store.ringContexts.set(item.sk.slice("ring-context#".length), value as unknown as RingArrivalContext); break;
      case "audit": store.auditEvents.push(value as unknown as AuditEvent); break;
    }
  }
  store.persist = async () => {
    const desired = snapshotState(store);
    const previous = await queryState(client, tableName);
    const desiredKeys = new Set(desired.map((item) => item.sk));
    const deletes = previous.filter((item) => !desiredKeys.has(item.sk)).map((item) => ({ DeleteRequest: { Key: { pk: DYNAMO_STATE_PK, sk: item.sk } } }));
    const puts = desired.map((item) => ({ PutRequest: { Item: item } }));
    await batchWrite(client, tableName, [...deletes, ...puts]);
  };
  return store;
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

  async prepareBooking(userId: string, input: PrepareBookingInput): Promise<Draft> {
    const asset = this.store.assets.get(input.assetId);
    const option = this.requireOption(input.optionId);
    const slot = this.requireSlot(input.slotId);
    if (!asset) throw new EmployeeError("NOT_FOUND", "That home asset is not available.");
    const payload = { assetId: asset.assetId, optionId: option.optionId, slotId: slot.slotId, addressLabel: input.addressLabel };
    const draft = this.saveDraft(userId, "booking", payload, `Book ${option.title} with ${option.providerName} for ${slot.startsAt}. Price ${option.price.amount} ${option.price.currency}.`);
    await this.persist();
    return draft;
  }

  async confirmBooking(userId: string, input: ConfirmBookingInput): Promise<Booking> {
    const existing = this.store.idempotency.get(`${userId}:${input.idempotencyKey}`);
    if (existing) return existing as Booking;
    const draft = this.validateDraft(userId, input, "booking");
    const payload = draft.payload as { assetId: string; optionId: string; slotId: string; addressLabel: string };
    const option = this.requireOption(payload.optionId);
    const slot = this.requireSlot(payload.slotId);
    const timestamp = nowIso();
    const booking: Booking = { bookingId: id("booking"), userId, assetId: payload.assetId, optionId: option.optionId, providerName: option.providerName, addressLabel: payload.addressLabel, scheduledStart: slot.startsAt, scheduledEnd: slot.endsAt, status: "scheduled", version: 1, createdAt: timestamp, updatedAt: timestamp };
    this.store.bookings.set(booking.bookingId, booking);
    this.recordAudit(userId, "booking_created", booking.bookingId);
    this.store.idempotency.set(`${userId}:${input.idempotencyKey}`, booking);
    this.store.drafts.delete(draft.draftId);
    await this.persist();
    return booking;
  }

  async prepareBookingChange(userId: string, input: PrepareBookingChangeInput): Promise<Draft> {
    const booking = this.requireBooking(userId, input.bookingId);
    const slot = this.requireSlot(input.slotId);
    const draft = this.saveDraft(userId, "booking_change", { bookingId: booking.bookingId, slotId: slot.slotId }, `Move your ${booking.providerName} visit to ${slot.startsAt}.` , booking.version);
    await this.persist();
    return draft;
  }

  async prepareBookingCancellation(userId: string, input: PrepareBookingCancellationInput): Promise<Draft> {
    const booking = this.requireBooking(userId, input.bookingId);
    if (booking.status === "cancelled") throw new EmployeeError("CONFLICT", "That appointment is already cancelled.");
    const draft = this.saveDraft(userId, "booking_cancellation", { bookingId: booking.bookingId }, `Cancel your ${booking.providerName} visit scheduled for ${booking.scheduledStart}.`, booking.version);
    await this.persist();
    return draft;
  }

  async confirmBookingChange(userId: string, input: ConfirmBookingChangeInput): Promise<Booking> {
    const existing = this.store.idempotency.get(`${userId}:${input.idempotencyKey}`);
    if (existing) return existing as Booking;
    const draft = this.validateDraft(userId, input, "booking_change");
    const payload = draft.payload as { bookingId: string; slotId: string };
    const booking = this.requireBooking(userId, payload.bookingId);
    if (booking.version !== draft.expectedVersion) throw new EmployeeError("CONFLICT", "The appointment changed while you were confirming it.");
    const slot = this.requireSlot(payload.slotId);
    const changed: Booking = { ...booking, scheduledStart: slot.startsAt, scheduledEnd: slot.endsAt, status: "rescheduled", version: booking.version + 1, updatedAt: nowIso() };
    this.store.bookings.set(booking.bookingId, changed);
    this.recordAudit(userId, "booking_rescheduled", booking.bookingId);
    this.store.idempotency.set(`${userId}:${input.idempotencyKey}`, changed);
    this.store.drafts.delete(draft.draftId);
    await this.persist();
    return changed;
  }

  async confirmBookingCancellation(userId: string, input: ConfirmBookingCancellationInput): Promise<Booking> {
    const existing = this.store.idempotency.get(`${userId}:${input.idempotencyKey}`);
    if (existing) return existing as Booking;
    const draft = this.validateDraft(userId, input, "booking_cancellation");
    const payload = draft.payload as { bookingId: string };
    const booking = this.requireBooking(userId, payload.bookingId);
    if (booking.version !== draft.expectedVersion) throw new EmployeeError("CONFLICT", "The appointment changed while you were confirming its cancellation.");
    const cancelled: Booking = { ...booking, status: "cancelled", version: booking.version + 1, updatedAt: nowIso() };
    this.store.bookings.set(booking.bookingId, cancelled);
    this.recordAudit(userId, "booking_cancelled", booking.bookingId);
    this.store.idempotency.set(`${userId}:${input.idempotencyKey}`, cancelled);
    this.store.drafts.delete(draft.draftId);
    await this.persist();
    return cancelled;
  }

  getServiceStatus(userId: string, bookingId: string) { return this.requireBooking(userId, bookingId); }

  getServiceDocument(userId: string, documentId: string) {
    const document = this.store.documents.get(documentId);
    if (!document) throw new EmployeeError("NOT_FOUND", "That service document was not found.");
    this.requireBooking(userId, document.bookingId);
    return document;
  }

  async createSimulatedDocument(userId: string, bookingId: string): Promise<ServiceDocument> {
    const booking = this.requireBooking(userId, bookingId);
    const document: ServiceDocument = { documentId: id("document"), bookingId, kind: "invoice", label: "Simulated service invoice", content: `SIMULATED — NOT A TAX DOCUMENT\nProvider: ${booking.providerName}\nBooking: ${booking.bookingId}`, simulated: true, createdAt: nowIso() };
    this.store.documents.set(document.documentId, document);
    this.recordAudit(userId, "document_created", document.documentId);
    await this.persist();
    return document;
  }

  async correlateRingEvent(userId: string, event: RingEvent): Promise<RingArrivalContext> {
    this.store.ringEvents.set(event.eventId, event);
    const eventTime = Date.parse(event.occurredAt);
    const booking = [...this.store.bookings.values()].find((candidate) => candidate.userId === userId && candidate.status !== "cancelled" && Math.abs(Date.parse(candidate.scheduledStart) - eventTime) <= 30 * 60 * 1000);
    const context: RingArrivalContext = { eventId: event.eventId, eventType: event.eventType, occurredAt: event.occurredAt, matchedBookingId: booking?.bookingId ?? null, message: booking ? `Your Ring detected activity during the scheduled service window. A ${booking.providerName} visit is expected now, but I can’t verify the person’s identity.` : "Your Ring detected activity, but it does not match a scheduled service window." };
    this.store.ringContexts.set(`${userId}:${event.eventId}`, context);
    this.recordAudit(userId, "ring_correlated", event.eventId);
    await this.persist();
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
  private recordAudit(userId: string, action: AuditEvent["action"], entityId: string) { this.store.auditEvents.push({ eventId: id("audit"), userId, action, entityId, occurredAt: nowIso() }); }
  private async persist() { if (this.store.persist) await this.store.persist(); }
}
