import { z } from "zod";
import { phonePkSchema } from "./common.schema";

export const orderChannelEnum = z.enum([
  "DINE_IN",
  "TAKEAWAY",
  "DELIVERY",
  "ONLINE",
  "WHATSAPP",
]);
export const orderStatusEnum = z.enum([
  "NEW",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
]);
export const paymentMethodEnum = z.enum([
  "CASH",
  "CARD",
  "JAZZCASH",
  "EASYPAISA",
  "BANK_TRANSFER",
  "SPLIT",
]);

export const orderItemInputSchema = z.object({
  menuItemId: z.string().cuid(),
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
  modifierIds: z.array(z.string().cuid()).max(20),
});

export const createOrderSchema = z
  .object({
    branchId: z.string().cuid(),
    channel: orderChannelEnum,
    tableId: z.string().cuid().optional().or(z.literal("")),
    customerPhone: phonePkSchema.optional().or(z.literal("")),
    customerName: z.string().trim().max(80).optional().or(z.literal("")),
    deliveryAddress: z.string().trim().max(300).optional().or(z.literal("")),
    items: z.array(orderItemInputSchema).min(1, "Add at least one item"),
    discountCents: z.number().int().min(0).default(0),
    tipCents: z.number().int().min(0).default(0),
    deliveryChargeCents: z.number().int().min(0).default(0),
    notes: z.string().trim().max(300).optional().or(z.literal("")),
    idempotencyKey: z.string().min(8).max(64),
  })
  .refine(
    (d) => d.channel !== "DINE_IN" || (!!d.tableId && d.tableId.length > 0),
    { path: ["tableId"], message: "Pick a table for dine-in" },
  )
  .refine(
    (d) => d.channel !== "DELIVERY" || (!!d.customerPhone && !!d.deliveryAddress),
    { path: ["customerPhone"], message: "Delivery requires phone + address" },
  );

export const orderStatusUpdateSchema = z.object({
  orderId: z.string().cuid(),
  toStatus: orderStatusEnum,
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const orderCancelSchema = z.object({
  orderId: z.string().cuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(200, "Reason max 200 characters"),
});

export const recordPaymentSchema = z
  .object({
    orderId: z.string().cuid(),
    method: paymentMethodEnum,
    amountRupees: z
      .number()
      .min(0.01)
      .max(10_000_000)
      .refine((n) => Math.round(n * 100) === n * 100, { message: "Up to 2 decimals" }),
    reference: z.string().trim().max(80).optional().or(z.literal("")),
    screenshotUrl: z.string().url().optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.method === "CASH" || d.method === "CARD" || d.method === "SPLIT" || !!d.reference,
    { path: ["reference"], message: "Reference required for JazzCash / Easypaisa / Bank Transfer" },
  );

// ── Tables ───────────────────────────────────────────────────────────
export const tableCreateSchema = z.object({
  branchId: z.string().cuid(),
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(20, "Label must be 20 characters or fewer"),
  seats: z.number().int().min(1).max(50),
});
export const tableUpdateSchema = tableCreateSchema.extend({
  id: z.string().cuid(),
});
export const tableDeleteSchema = z.object({ id: z.string().cuid() });
export const tableStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["FREE", "OCCUPIED", "RESERVED", "BILLING"]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type TableCreateInput = z.infer<typeof tableCreateSchema>;
