import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(3, "Code must be 3–20 characters")
  .max(20, "Code must be 3–20 characters")
  .regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, underscore or dash only");

export const createCouponSchema = z
  .object({
    code: codeSchema,
    type: z.enum(["PERCENT_OFF", "FLAT_OFF", "FREE_DELIVERY"]),
    // PERCENT_OFF: percent input (0-100, stored as bps server-side)
    percent: z.coerce.number().min(1).max(100).optional(),
    // FLAT_OFF: rupees input (stored as cents server-side)
    flatRupees: z.coerce.number().int().min(1).max(1_000_000).optional(),
    // Cap on percent discounts in rupees (optional).
    maxDiscountRupees: z.coerce.number().int().min(0).max(1_000_000).optional(),
    minOrderRupees: z.coerce.number().int().min(0).max(1_000_000).default(0),
    maxRedemptions: z.coerce.number().int().min(1).max(1_000_000).optional(),
    validUntil: z.string().datetime().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT_OFF" && !d.percent) {
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Percent is required" });
    }
    if (d.type === "FLAT_OFF" && !d.flatRupees) {
      ctx.addIssue({ code: "custom", path: ["flatRupees"], message: "Amount is required" });
    }
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const validateCouponSchema = z.object({
  slug: z.string().min(3).max(40),
  code: codeSchema,
  // Subtotal in cents — needed to enforce minOrder + cap discount.
  subtotalCents: z.number().int().min(0),
  channel: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE"]),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
