import { z } from "zod";
import { phonePkSchema } from "./common.schema";

export const branchCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Branch name must be 2–60 characters")
    .max(60, "Branch name must be 2–60 characters"),
  address: z.string().trim().max(200, "Address must be 200 characters or fewer").optional(),
  phone: phonePkSchema.optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  taxBps: z
    .number()
    .int("Tax must be a whole percentage")
    .min(0, "Tax must be between 0 and 100")
    .max(10_000, "Tax must be between 0 and 100"),
  serviceBps: z
    .number()
    .int("Service charge must be a whole percentage")
    .min(0, "Service charge must be between 0 and 100")
    .max(10_000, "Service charge must be between 0 and 100"),
});
export type BranchCreateInput = z.infer<typeof branchCreateSchema>;

export const branchUpdateSchema = branchCreateSchema.extend({
  id: z.string().cuid(),
  isActive: z.boolean(),
});
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;

export const branchDeleteSchema = z.object({ id: z.string().cuid() });
