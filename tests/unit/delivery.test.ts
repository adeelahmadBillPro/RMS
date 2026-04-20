import { describe, it, expect } from "vitest";
import {
  assignDeliverySchema,
  collectCashSchema,
  reconcileCashSchema,
  submitCashSchema,
  updateAssignmentStatusSchema,
} from "@/lib/validations/delivery.schema";

const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";

describe("validations / delivery", () => {
  it("assign requires orderId + deliveryUserId", () => {
    expect(assignDeliverySchema.safeParse({ orderId: "", deliveryUserId: "" }).success).toBe(false);
    expect(
      assignDeliverySchema.safeParse({ orderId: cuid, deliveryUserId: cuid }).success,
    ).toBe(true);
  });

  it("return status needs a reason", () => {
    expect(
      updateAssignmentStatusSchema.safeParse({ assignmentId: cuid, toStatus: "RETURNED" }).success,
    ).toBe(false);
    expect(
      updateAssignmentStatusSchema.safeParse({
        assignmentId: cuid,
        toStatus: "RETURNED",
        returnReason: "customer absent",
      }).success,
    ).toBe(true);
  });

  it("pickup / delivered don't need a reason", () => {
    expect(
      updateAssignmentStatusSchema.safeParse({ assignmentId: cuid, toStatus: "PICKED_UP" }).success,
    ).toBe(true);
    expect(
      updateAssignmentStatusSchema.safeParse({ assignmentId: cuid, toStatus: "DELIVERED" }).success,
    ).toBe(true);
  });

  it("collect cash clamps to 2 decimals", () => {
    expect(
      collectCashSchema.safeParse({ assignmentId: cuid, collectedRupees: 100.123 }).success,
    ).toBe(false);
    expect(
      collectCashSchema.safeParse({ assignmentId: cuid, collectedRupees: 100.5 }).success,
    ).toBe(true);
  });

  it("submit cash requires at least one assignment", () => {
    expect(submitCashSchema.safeParse({ assignmentIds: [] }).success).toBe(false);
    expect(submitCashSchema.safeParse({ assignmentIds: [cuid] }).success).toBe(true);
  });

  it("dispute requires notes", () => {
    expect(
      reconcileCashSchema.safeParse({ submissionId: cuid, decision: "DISPUTED" }).success,
    ).toBe(false);
    expect(
      reconcileCashSchema.safeParse({
        submissionId: cuid,
        decision: "DISPUTED",
        reconcileNotes: "Rs 200 short",
      }).success,
    ).toBe(true);
    expect(
      reconcileCashSchema.safeParse({ submissionId: cuid, decision: "RECONCILED" }).success,
    ).toBe(true);
  });
});
