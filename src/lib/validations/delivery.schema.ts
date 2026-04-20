import { z } from "zod";

export const assignDeliverySchema = z.object({
  orderId: z.string().cuid(),
  deliveryUserId: z.string().cuid(),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const updateAssignmentStatusSchema = z
  .object({
    assignmentId: z.string().cuid(),
    toStatus: z.enum(["PICKED_UP", "DELIVERED", "RETURNED"]),
    returnReason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine(
    (d) => d.toStatus !== "RETURNED" || (d.returnReason && d.returnReason.length > 0),
    { path: ["returnReason"], message: "Reason required when marking returned" },
  );

export const collectCashSchema = z.object({
  assignmentId: z.string().cuid(),
  collectedRupees: z
    .number()
    .min(0)
    .max(10_000_000)
    .refine((n) => Math.round(n * 100) === n * 100, { message: "Up to 2 decimals" }),
});

export const submitCashSchema = z.object({
  assignmentIds: z.array(z.string().cuid()).min(1, "Pick at least one assignment"),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const reconcileCashSchema = z
  .object({
    submissionId: z.string().cuid(),
    decision: z.enum(["RECONCILED", "DISPUTED"]),
    reconcileNotes: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.decision !== "DISPUTED" || (d.reconcileNotes && d.reconcileNotes.length > 0),
    { path: ["reconcileNotes"], message: "Notes required when disputing" },
  );

export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
export type CollectCashInput = z.infer<typeof collectCashSchema>;
export type SubmitCashInput = z.infer<typeof submitCashSchema>;
export type ReconcileCashInput = z.infer<typeof reconcileCashSchema>;
