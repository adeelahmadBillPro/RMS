import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  toggleWhatsAppSchema,
  webhookPayloadSchema,
} from "@/lib/validations/whatsapp.schema";

const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";

describe("validations / whatsapp", () => {
  it("send requires non-empty body", () => {
    expect(sendMessageSchema.safeParse({ threadId: cuid, body: "" }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ threadId: cuid, body: "hi" }).success).toBe(true);
  });

  it("toggle accepts optional whatsappNumber", () => {
    expect(toggleWhatsAppSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(
      toggleWhatsAppSchema.safeParse({ enabled: true, whatsappNumber: "03001234567" }).success,
    ).toBe(true);
    expect(
      toggleWhatsAppSchema.safeParse({ enabled: true, whatsappNumber: "123" }).success,
    ).toBe(false);
  });

  it("webhook requires tenantSlug + fromPhone + body", () => {
    expect(
      webhookPayloadSchema.safeParse({
        tenantSlug: "burgerhub",
        fromPhone: "03001234567",
        body: "hi",
      }).success,
    ).toBe(true);
    expect(webhookPayloadSchema.safeParse({ tenantSlug: "", body: "hi" }).success).toBe(false);
  });
});
