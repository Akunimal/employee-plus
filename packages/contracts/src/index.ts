import { z } from "zod";

export const MoneySchema = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.literal("USD"),
});
export type Money = z.infer<typeof MoneySchema>;

export const BookingStatusSchema = z.enum([
  "scheduled",
  "rescheduled",
  "completed",
  "cancelled",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const HomeAssetSchema = z.object({
  assetId: z.string().regex(/^asset_[a-z0-9_]+$/),
  type: z.enum(["water_heater", "hvac", "roof", "plumbing", "appliance"]),
  name: z.string().min(1).max(80),
  location: z.string().min(1).max(80),
  maintenanceDue: z.boolean(),
  lastServicedAt: z.string().datetime(),
});
export type HomeAsset = z.infer<typeof HomeAssetSchema>;

export const ServiceOptionSchema = z.object({
  optionId: z.string().regex(/^option_[a-z0-9_]+$/),
  serviceType: z.enum(["repair", "maintenance", "inspection"]),
  title: z.string().min(1).max(120),
  providerName: z.string().min(1).max(120),
  rating: z.number().min(0).max(5),
  price: MoneySchema,
  durationMinutes: z.number().int().positive(),
  warrantyMonths: z.number().int().nonnegative(),
  description: z.string().min(1).max(240),
});
export type ServiceOption = z.infer<typeof ServiceOptionSchema>;

export const AvailabilitySlotSchema = z.object({
  slotId: z.string().regex(/^slot_[a-z0-9_]+$/),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  timezone: z.string().min(1),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const BookingSchema = z.object({
  bookingId: z.string().regex(/^booking_[a-z0-9_]+$/),
  userId: z.string().min(1),
  assetId: HomeAssetSchema.shape.assetId,
  optionId: ServiceOptionSchema.shape.optionId,
  providerName: z.string().min(1),
  addressLabel: z.string().min(1).max(120),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  status: BookingStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const ServiceDocumentSchema = z.object({
  documentId: z.string().regex(/^document_[a-z0-9_]+$/),
  bookingId: BookingSchema.shape.bookingId,
  kind: z.enum(["invoice", "receipt", "service_report"]),
  label: z.string().min(1).max(160),
  content: z.string().min(1),
  simulated: z.literal(true),
  createdAt: z.string().datetime(),
});
export type ServiceDocument = z.infer<typeof ServiceDocumentSchema>;

export const DraftSchema = z.object({
  draftId: z.string().regex(/^draft_[a-z0-9_]+$/),
  userId: z.string().min(1),
  operation: z.enum(["booking", "booking_change"]),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  expectedVersion: z.number().int().positive().optional(),
  expiresAt: z.string().datetime(),
  confirmationToken: z.string().min(32),
  summary: z.string().min(1).max(500),
  requiresExplicitConfirmation: z.literal(true),
  payload: z.record(z.string(), z.unknown()),
});
export type Draft = z.infer<typeof DraftSchema>;

export const ToolErrorCodeSchema = z.enum([
  "INVALID_INPUT",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "EXPIRED_DRAFT",
  "INVALID_CONFIRMATION",
  "DUPLICATE_REQUEST",
  "DEPENDENCY_FAILURE",
]);
export type ToolErrorCode = z.infer<typeof ToolErrorCodeSchema>;

export class EmployeeError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
    public readonly recoverable = true,
  ) {
    super(message);
    this.name = "EmployeeError";
  }
}

export const PrepareBookingInputSchema = z.object({
  assetId: HomeAssetSchema.shape.assetId,
  optionId: ServiceOptionSchema.shape.optionId,
  slotId: AvailabilitySlotSchema.shape.slotId,
  addressLabel: z.string().min(1).max(120),
});
export type PrepareBookingInput = z.infer<typeof PrepareBookingInputSchema>;

export const ConfirmBookingInputSchema = z.object({
  draftId: DraftSchema.shape.draftId,
  confirmationToken: z.string().min(32),
  payloadHash: DraftSchema.shape.payloadHash,
  idempotencyKey: z.string().min(16).max(120),
});
export type ConfirmBookingInput = z.infer<typeof ConfirmBookingInputSchema>;

export const PrepareBookingChangeInputSchema = z.object({
  bookingId: BookingSchema.shape.bookingId,
  slotId: AvailabilitySlotSchema.shape.slotId,
});
export type PrepareBookingChangeInput = z.infer<typeof PrepareBookingChangeInputSchema>;

export const ConfirmBookingChangeInputSchema = ConfirmBookingInputSchema;
export type ConfirmBookingChangeInput = z.infer<typeof ConfirmBookingChangeInputSchema>;

export const QuoteSearchInputSchema = z.object({
  assetId: HomeAssetSchema.shape.assetId.optional(),
  serviceType: ServiceOptionSchema.shape.serviceType,
  maxResults: z.number().int().min(1).max(5).default(5),
});
export type QuoteSearchInput = z.infer<typeof QuoteSearchInputSchema>;

export const RingArrivalContextSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.enum(["doorbell_press", "motion"]),
  occurredAt: z.string().datetime(),
  matchedBookingId: BookingSchema.shape.bookingId.nullable(),
  message: z.string().min(1).max(400),
});
export type RingArrivalContext = z.infer<typeof RingArrivalContextSchema>;

export const ToolResultSchema = z.object({
  structuredContent: z.record(z.string(), z.unknown()),
  text: z.string().min(1),
});

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new EmployeeError("INVALID_INPUT", result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  }
  return result.data;
}
