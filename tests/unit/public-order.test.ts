import { describe, it, expect } from "vitest";
import { publicOrderSchema } from "@/lib/validations/public-order.schema";
import { rateLimit, rateLimitReset } from "@/lib/rate-limit";

const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";

const baseValid = {
  slug: "burgerhub",
  channel: "TAKEAWAY" as const,
  customerPhone: "03001234567",
  customerName: "Demo Customer",
  items: [{ variantId: cuid, quantity: 2, modifierIds: [] }],
  idempotencyKey: "abcd1234efgh",
};

describe("validations / public order", () => {
  it("accepts a clean takeaway payload", () => {
    expect(publicOrderSchema.safeParse(baseValid).success).toBe(true);
  });
  it("dine-in requires tableQr", () => {
    expect(
      publicOrderSchema.safeParse({ ...baseValid, channel: "DINE_IN" }).success,
    ).toBe(false);
  });
  it("delivery requires deliveryAddress", () => {
    expect(
      publicOrderSchema.safeParse({ ...baseValid, channel: "DELIVERY" }).success,
    ).toBe(false);
  });
  it("rejects invalid PK phone", () => {
    expect(
      publicOrderSchema.safeParse({ ...baseValid, customerPhone: "12345" }).success,
    ).toBe(false);
  });
  it("rejects empty cart", () => {
    expect(publicOrderSchema.safeParse({ ...baseValid, items: [] }).success).toBe(false);
  });
});

describe("rate-limit", () => {
  it("allows up to N then blocks", () => {
    const key = `test/${Math.random()}`;
    rateLimitReset(key);
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });
  it("returns remaining count", () => {
    const key = `test/${Math.random()}`;
    rateLimitReset(key);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });
});
