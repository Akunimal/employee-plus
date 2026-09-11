import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { EmployeeError } from "@employee-plus/contracts";

export const RingWebhookEventSchema = z.object({
  eventId: z.string().min(1).max(200),
  deviceId: z.string().min(1).max(200),
  eventType: z.enum(["doorbell_press", "motion"]),
  occurredAt: z.string().datetime(),
  subject: z.string().min(1).max(200).optional(),
});
export type RingWebhookEvent = z.infer<typeof RingWebhookEventSchema>;

export function verifyRingWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const supplied = signature.replace(/^sha256=/, "").toLowerCase();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export class RingWebhookDeduplicator {
  private readonly eventIds = new Set<string>();
  constructor(private readonly maxEntries = 10_000) {}
  accept(eventId: string): boolean {
    if (this.eventIds.has(eventId)) return false;
    if (this.eventIds.size >= this.maxEntries) this.eventIds.delete(this.eventIds.values().next().value as string);
    this.eventIds.add(eventId);
    return true;
  }
}

export function parseRingWebhook(rawBody: string): RingWebhookEvent {
  let decoded: unknown;
  try { decoded = JSON.parse(rawBody); } catch { throw new EmployeeError("INVALID_INPUT", "Ring event payload is invalid."); }
  const result = RingWebhookEventSchema.safeParse(decoded);
  if (!result.success) throw new EmployeeError("INVALID_INPUT", "Ring event payload is invalid.");
  return result.data;
}
