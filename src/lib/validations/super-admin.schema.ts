import { z } from "zod";

export const impersonateTenantSchema = z.object({
  tenantId: z.string().cuid("Invalid tenant id"),
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(200, "Reason must be 200 characters or fewer"),
});

export const extendTrialSchema = z.object({
  tenantId: z.string().cuid(),
  days: z.number().int().min(1, "Add at least 1 day").max(365, "Up to 365 days at a time"),
});
