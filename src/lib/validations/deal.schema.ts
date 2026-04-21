import { z } from "zod";

export const dealTypeEnum = z.enum(["PERCENT_OFF", "FLAT_OFF", "FREE_DELIVERY"]);

export const dealCreateSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be 2–60 chars").max(60),
    subtitle: z.string().trim().max(120).optional().or(z.literal("")),
    type: dealTypeEnum,
    percentBps: z
      .number()
      .int()
      .min(1, "Between 1 and 100%")
      .max(10_000, "Between 1 and 100%")
      .optional()
      .nullable(),
    flatOffRupees: z.number().min(0).max(10_000_000).optional().nullable(),
    minOrderRupees: z
      .number()
      .min(0)
      .max(10_000_000)
      .refine((n) => Math.round(n * 100) === n * 100, { message: "Up to 2 decimals" }),
    heroImageUrl: z.string().url().optional().or(z.literal("")),
    bgColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Hex color like #EA580C")
      .optional()
      .or(z.literal("")),
    ctaLabel: z.string().trim().max(30).optional().or(z.literal("")),
    startsAt: z.string().optional(),
    endsAt: z.string().optional().or(z.literal("")),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
  })
  .refine(
    (d) => d.type !== "PERCENT_OFF" || (d.percentBps != null && d.percentBps > 0),
    { path: ["percentBps"], message: "Enter a discount %" },
  )
  .refine(
    (d) => d.type !== "FLAT_OFF" || (d.flatOffRupees != null && d.flatOffRupees > 0),
    { path: ["flatOffRupees"], message: "Enter a flat amount" },
  );

export const dealUpdateSchema = dealCreateSchema.and(z.object({ id: z.string().cuid() }));
export const dealDeleteSchema = z.object({ id: z.string().cuid() });

export type DealCreateInput = z.infer<typeof dealCreateSchema>;
