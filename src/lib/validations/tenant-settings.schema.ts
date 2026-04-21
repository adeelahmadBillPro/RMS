import { z } from "zod";

export const cuisineTypeEnum = z.enum([
  "RESTAURANT",
  "CAFE",
  "FAST_FOOD",
  "BAKERY",
  "CLOUD_KITCHEN",
  "OTHER",
]);

export const tenantProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be 2+ chars").max(60),
  cuisineType: cuisineTypeEnum,
  contactPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Hex color like #EA580C")
    .optional()
    .or(z.literal("")),
});
export type TenantProfileInput = z.infer<typeof tenantProfileSchema>;

export const tenantChannelsSchema = z.object({
  hasDelivery: z.boolean(),
  hasTakeaway: z.boolean(),
  acceptCash: z.boolean(),
  acceptCard: z.boolean(),
  acceptJazzCash: z.boolean(),
  acceptEasypaisa: z.boolean(),
  acceptBankTransfer: z.boolean(),
});
export type TenantChannelsInput = z.infer<typeof tenantChannelsSchema>;

export const tenantLocaleSchema = z.object({
  currency: z.string().trim().min(2).max(6),
  timezone: z.string().trim().min(2).max(64),
  locale: z.string().trim().min(2).max(8),
});
export type TenantLocaleInput = z.infer<typeof tenantLocaleSchema>;
