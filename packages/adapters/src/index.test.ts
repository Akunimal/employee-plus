import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EmployeeError } from "@employee-plus/contracts";
import { RingWebhookDeduplicator, parseRingWebhook, verifyRingWebhookSignature } from "./index.js";

describe("Ring webhook adapter", () => {
  const body = JSON.stringify({ eventId: "evt-1", deviceId: "dev-1", eventType: "doorbell_press", occurredAt: "2026-09-11T09:00:00.000Z" });
  const signature = createHmac("sha256", "secret").update(body).digest("hex");

  it("accepts the exact signed raw payload", () => expect(verifyRingWebhookSignature(body, `sha256=${signature}`, "secret")).toBe(true));
  it("rejects tampering and missing secrets", () => {
    expect(verifyRingWebhookSignature(`${body} `, signature, "secret")).toBe(false);
    expect(verifyRingWebhookSignature(body, signature, "")).toBe(false);
  });
  it("deduplicates event IDs", () => {
    const dedupe = new RingWebhookDeduplicator();
    expect(dedupe.accept("evt-1")).toBe(true);
    expect(dedupe.accept("evt-1")).toBe(false);
  });
  it("evicts the oldest event when the dedupe window is full", () => {
    const dedupe = new RingWebhookDeduplicator(1);
    expect(dedupe.accept("evt-1")).toBe(true);
    expect(dedupe.accept("evt-2")).toBe(true);
    expect(dedupe.accept("evt-1")).toBe(true);
  });
  it("parses only the narrow event metadata contract", () => expect(parseRingWebhook(body).eventType).toBe("doorbell_press"));
  it("rejects malformed and out-of-contract payloads", () => {
    expect(() => parseRingWebhook("not-json")).toThrowError(EmployeeError);
    expect(() => parseRingWebhook(JSON.stringify({ eventId: "evt-1" }))).toThrowError(EmployeeError);
  });
});
