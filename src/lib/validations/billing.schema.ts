import { z } from "zod";

export const requestPlanUpgradeSchema = z.object({
  targetPlanCode: z.string().min(2),
  method: z.enum(["BANK", "JAZZCASH", "EASYPAISA", "CARD"]),
  reference: z.string().trim().max(60).optional().or(z.literal("")),
  screenshotUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RequestPlanUpgradeInput = z.infer<typeof requestPlanUpgradeSchema>;
