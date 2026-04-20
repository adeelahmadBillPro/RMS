import { describe, it, expect } from "vitest";
import { computeTotals, lineKey, type CartLine } from "@/lib/orders/cart";
import { createOrderSchema, recordPaymentSchema } from "@/lib/validations/order.schema";

const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";

const sampleLine: CartLine = {
  lineKey: "v::",
  menuItemId: "i",
  variantId: "v",
  itemNameSnap: "Burger",
  variantNameSnap: "Single",
  unitPriceCents: 50_000, // PKR 500
  quantity: 2,
  modifiers: [{ modifierId: "m", modifierNameSnap: "Cheese", priceDeltaCents: 5_000 }],
};

describe("orders / cart math", () => {
  it("computes line + tax + service correctly", () => {
    const totals = computeTotals({
      lines: [sampleLine],
      taxBps: 1700,
      serviceBps: 500,
      tipCents: 0,
      deliveryChargeCents: 0,
    });
    // line subtotal = (500 + 50) * 2 = 1100 → 110_000 paisa
    expect(totals.subtotalCents).toBe(110_000);
    expect(totals.taxCents).toBe(Math.round((110_000 * 1700) / 10_000));
    expect(totals.serviceCents).toBe(Math.round((110_000 * 500) / 10_000));
    expect(totals.totalCents).toBe(totals.subtotalCents + totals.taxCents + totals.serviceCents);
  });

  it("clamps discount to subtotal", () => {
    const totals = computeTotals({
      lines: [sampleLine],
      taxBps: 0,
      serviceBps: 0,
      discountCents: 999_999_999,
    });
    expect(totals.discountCents).toBe(110_000);
    expect(totals.taxableCents).toBe(0);
  });

  it("lineKey is order-stable for modifier sets", () => {
    expect(lineKey("v", ["a", "b"])).toBe(lineKey("v", ["b", "a"]));
  });
});

describe("validations / orders", () => {
  const baseOrder = {
    branchId: cuid,
    channel: "TAKEAWAY" as const,
    items: [{ menuItemId: cuid, variantId: cuid, quantity: 1, modifierIds: [] }],
    discountCents: 0,
    tipCents: 0,
    deliveryChargeCents: 0,
    idempotencyKey: "abcd1234",
  };

  it("dine-in requires tableId", () => {
    expect(
      createOrderSchema.safeParse({ ...baseOrder, channel: "DINE_IN" }).success,
    ).toBe(false);
  });
  it("delivery requires phone + address", () => {
    expect(
      createOrderSchema.safeParse({ ...baseOrder, channel: "DELIVERY" }).success,
    ).toBe(false);
  });
  it("takeaway accepts a clean payload", () => {
    expect(createOrderSchema.safeParse(baseOrder).success).toBe(true);
  });
});

describe("validations / payments", () => {
  it("requires reference for JazzCash", () => {
    expect(
      recordPaymentSchema.safeParse({
        orderId: cuid,
        method: "JAZZCASH",
        amountRupees: 100,
        reference: "",
      }).success,
    ).toBe(false);
  });
  it("cash payment without reference passes", () => {
    expect(
      recordPaymentSchema.safeParse({
        orderId: cuid,
        method: "CASH",
        amountRupees: 100,
      }).success,
    ).toBe(true);
  });
});
