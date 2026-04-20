import { z } from "zod";
import { phonePkSchema, slugSchema } from "./common.schema";

export const onboardingStep1Schema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Restaurant name must be 2–60 characters")
    .max(60, "Restaurant name must be 2–60 characters"),
  slug: slugSchema,
  contactPhone: phonePkSchema,
  cuisineType: z.enum(
    ["restaurant", "cafe", "fast_food", "bakery", "cloud_kitchen", "other"],
    { errorMap: () => ({ message: "Pick a business type" }) },
  ),
});

export const onboardingStep2Schema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Brand color must be a hex like #EA580C")
    .optional()
    .or(z.literal("")),
});

export const onboardingStep3Schema = z.object({
  categories: z
    .array(z.string().trim().min(1, "Category name is required").max(40))
    .min(1, "Add at least one menu category")
    .max(20, "Up to 20 categories at this stage"),
});

export const onboardingStep4Schema = z.object({
  tableCount: z
    .number()
    .int()
    .min(0, "Tables must be 0 or more")
    .max(500, "Up to 500 tables for now"),
  hasDelivery: z.boolean(),
  hasTakeaway: z.boolean(),
});

export const onboardingStep5Schema = z.object({
  acceptCash: z.boolean(),
  acceptCard: z.boolean(),
  acceptJazzCash: z.boolean(),
  acceptEasypaisa: z.boolean(),
  acceptBankTransfer: z.boolean(),
});

export const onboardingFullSchema = onboardingStep1Schema
  .merge(onboardingStep2Schema)
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema)
  .merge(onboardingStep5Schema);

export type OnboardingFullInput = z.infer<typeof onboardingFullSchema>;
