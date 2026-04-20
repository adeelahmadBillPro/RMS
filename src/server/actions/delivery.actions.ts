"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { rupeesToPaisa } from "@/lib/utils";
import { realtime, REALTIME_EVENTS, tenantChannel } from "@/lib/realtime";
import {
  assignDeliverySchema,
  collectCashSchema,
  reconcileCashSchema,
  submitCashSchema,
  updateAssignmentStatusSchema,
} from "@/lib/validations/delivery.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function canManage(role: string) {
  return role === "OWNER" || role === "MANAGER";
}
function isRiderRole(role: string) {
  return role === "DELIVERY";
}

export async function assignDeliveryAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ assignmentId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can assign deliveries." };
  const parsed = assignDeliverySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  // Verify order belongs to tenant, is DELIVERY channel, and not terminal
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: ctx.tenantId },
    include: { deliveryAssignment: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.channel !== "DELIVERY")
    return { ok: false, error: "Only delivery orders can be assigned to riders." };
  if (order.status === "COMPLETED" || order.status === "CANCELLED")
    return { ok: false, error: `Order is already ${order.status.toLowerCase()}.` };
  if (order.deliveryAssignment && order.deliveryAssignment.status !== "CANCELLED" && order.deliveryAssignment.status !== "RETURNED") {
    return { ok: false, error: "This order is already assigned." };
  }

  // Verify rider is in this tenant with DELIVERY role
  const rider = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: ctx.tenantId,
      userId: parsed.data.deliveryUserId,
      role: "DELIVERY",
      deletedAt: null,
    },
    select: { userId: true },
  });
  if (!rider)
    return {
      ok: false,
      error: "That rider is not a delivery member of this tenant.",
      fieldErrors: { deliveryUserId: "Pick another rider" },
    };

  const assignment = await prisma.deliveryAssignment.upsert({
    where: { orderId: order.id },
    update: {
      deliveryUserId: parsed.data.deliveryUserId,
      status: "ASSIGNED",
      notes: parsed.data.notes || null,
      pickedUpAt: null,
      deliveredAt: null,
      returnedAt: null,
      returnReason: null,
      collectedCashCents: 0,
      cashSubmissionId: null,
    },
    create: {
      tenantId: ctx.tenantId,
      orderId: order.id,
      deliveryUserId: parsed.data.deliveryUserId,
      notes: parsed.data.notes || null,
    },
  });

  await audit({
    action: "DELIVERY_ASSIGNED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { orderId: order.id, riderId: parsed.data.deliveryUserId },
  });
  await realtime.trigger(tenantChannel(ctx.tenantId), REALTIME_EVENTS.ORDER_UPDATED, {
    id: order.id,
    assignmentStatus: "ASSIGNED",
  });
  revalidatePath(`/${slug}/deliveries`);
  revalidatePath(`/${slug}/deliveries/mine`);
  revalidatePath(`/${slug}/orders`);
  return { ok: true, data: { assignmentId: assignment.id } };
}

export async function updateAssignmentStatusAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ assignmentId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role) && !isRiderRole(ctx.membership.role))
    return { ok: false, error: "Forbidden." };
  const parsed = updateAssignmentStatusSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const assignment = await prisma.deliveryAssignment.findFirst({
    where: { id: parsed.data.assignmentId, tenantId: ctx.tenantId },
    include: { order: { select: { id: true, status: true, totalCents: true } } },
  });
  if (!assignment) return { ok: false, error: "Assignment not found." };

  // Rider can only move their own assignments
  if (isRiderRole(ctx.membership.role) && assignment.deliveryUserId !== ctx.userId) {
    return { ok: false, error: "That assignment belongs to another rider." };
  }

  // Enforce forward-only transitions
  const order: Record<string, number> = { ASSIGNED: 0, PICKED_UP: 1, DELIVERED: 2, RETURNED: 3, CANCELLED: 3 };
  if ((order[parsed.data.toStatus] ?? 99) <= (order[assignment.status] ?? 0)) {
    return { ok: false, error: `Can't move from ${assignment.status} to ${parsed.data.toStatus}.` };
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.deliveryAssignment.update({
      where: { id: assignment.id },
      data: {
        status: parsed.data.toStatus,
        pickedUpAt: parsed.data.toStatus === "PICKED_UP" ? now : assignment.pickedUpAt,
        deliveredAt: parsed.data.toStatus === "DELIVERED" ? now : assignment.deliveredAt,
        returnedAt: parsed.data.toStatus === "RETURNED" ? now : assignment.returnedAt,
        returnReason: parsed.data.toStatus === "RETURNED" ? parsed.data.returnReason ?? null : assignment.returnReason,
      },
    });

    // Keep the Order's status in lock-step with delivery milestones
    if (parsed.data.toStatus === "PICKED_UP" && assignment.order.status !== "OUT_FOR_DELIVERY") {
      await tx.order.update({
        where: { id: assignment.order.id },
        data: { status: "OUT_FOR_DELIVERY" },
      });
      await tx.orderStatusLog.create({
        data: {
          orderId: assignment.order.id,
          fromStatus: assignment.order.status,
          toStatus: "OUT_FOR_DELIVERY",
          changedById: ctx.userId,
          notes: "Rider picked up",
        },
      });
    }
    if (parsed.data.toStatus === "DELIVERED" && assignment.order.status !== "COMPLETED") {
      await tx.order.update({
        where: { id: assignment.order.id },
        data: { status: "COMPLETED", completedAt: now },
      });
      await tx.orderStatusLog.create({
        data: {
          orderId: assignment.order.id,
          fromStatus: assignment.order.status,
          toStatus: "COMPLETED",
          changedById: ctx.userId,
          notes: "Delivered",
        },
      });
    }
  });

  await audit({
    action:
      parsed.data.toStatus === "PICKED_UP"
        ? "DELIVERY_PICKED_UP"
        : parsed.data.toStatus === "DELIVERED"
          ? "DELIVERY_COMPLETED"
          : "DELIVERY_RETURNED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { assignmentId: assignment.id, toStatus: parsed.data.toStatus },
  });
  await realtime.trigger(tenantChannel(ctx.tenantId), REALTIME_EVENTS.ORDER_UPDATED, {
    id: assignment.orderId,
    assignmentStatus: parsed.data.toStatus,
  });
  revalidatePath(`/${slug}/deliveries`);
  revalidatePath(`/${slug}/deliveries/mine`);
  revalidatePath(`/${slug}/orders`);
  return { ok: true, data: { assignmentId: assignment.id } };
}

export async function collectCashAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ assignmentId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role) && !isRiderRole(ctx.membership.role))
    return { ok: false, error: "Forbidden." };
  const parsed = collectCashSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const assignment = await prisma.deliveryAssignment.findFirst({
    where: { id: parsed.data.assignmentId, tenantId: ctx.tenantId },
    include: { order: { select: { totalCents: true } } },
  });
  if (!assignment) return { ok: false, error: "Assignment not found." };
  if (isRiderRole(ctx.membership.role) && assignment.deliveryUserId !== ctx.userId)
    return { ok: false, error: "That assignment belongs to another rider." };
  if (assignment.cashSubmissionId)
    return { ok: false, error: "Cash already dropped to the envelope. Edit via manager." };

  const amount = rupeesToPaisa(parsed.data.collectedRupees);
  if (amount > assignment.order.totalCents + 100) {
    return { ok: false, error: "Collected cash exceeds order total." };
  }

  await prisma.deliveryAssignment.update({
    where: { id: assignment.id },
    data: { collectedCashCents: amount },
  });
  revalidatePath(`/${slug}/deliveries`);
  revalidatePath(`/${slug}/deliveries/mine`);
  return { ok: true, data: { assignmentId: assignment.id } };
}

export async function submitCashAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ submissionId: string; totalCents: number }>> {
  const ctx = await getTenantContext(slug);
  if (!isRiderRole(ctx.membership.role) && !canManage(ctx.membership.role))
    return { ok: false, error: "Forbidden." };
  const parsed = submitCashSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  // Riders submit their own envelopes; managers can submit on behalf.
  const riderId = isRiderRole(ctx.membership.role) ? ctx.userId : undefined;

  const assignments = await prisma.deliveryAssignment.findMany({
    where: {
      id: { in: parsed.data.assignmentIds },
      tenantId: ctx.tenantId,
      ...(riderId ? { deliveryUserId: riderId } : {}),
      status: "DELIVERED",
      cashSubmissionId: null,
    },
  });
  if (assignments.length !== parsed.data.assignmentIds.length) {
    return {
      ok: false,
      error:
        "Some assignments are not eligible (must be DELIVERED, belong to this rider, and not already submitted).",
    };
  }

  // Everyone in the batch must be for the same rider
  const riderIds = new Set(assignments.map((a) => a.deliveryUserId));
  if (riderIds.size !== 1)
    return { ok: false, error: "Batch must be for a single rider." };
  const batchRiderId = [...riderIds][0]!;

  const totalCents = assignments.reduce((s, a) => s + a.collectedCashCents, 0);

  const submission = await prisma.$transaction(async (tx) => {
    const s = await tx.deliveryCashSubmission.create({
      data: {
        tenantId: ctx.tenantId,
        deliveryUserId: batchRiderId,
        totalCents,
        notes: parsed.data.notes || null,
      },
    });
    await tx.deliveryAssignment.updateMany({
      where: { id: { in: parsed.data.assignmentIds } },
      data: { cashSubmissionId: s.id },
    });
    return s;
  });

  await audit({
    action: "DELIVERY_CASH_SUBMITTED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { submissionId: submission.id, riderId: batchRiderId, totalCents, count: assignments.length },
  });
  revalidatePath(`/${slug}/deliveries`);
  revalidatePath(`/${slug}/deliveries/mine`);
  return { ok: true, data: { submissionId: submission.id, totalCents } };
}

export async function reconcileCashAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ submissionId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can reconcile cash." };
  const parsed = reconcileCashSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const sub = await prisma.deliveryCashSubmission.findFirst({
    where: { id: parsed.data.submissionId, tenantId: ctx.tenantId },
  });
  if (!sub) return { ok: false, error: "Submission not found." };
  if (sub.status !== "PENDING")
    return { ok: false, error: `Already ${sub.status.toLowerCase()}.` };

  await prisma.deliveryCashSubmission.update({
    where: { id: sub.id },
    data: {
      status: parsed.data.decision,
      reconcileNotes: parsed.data.reconcileNotes || null,
      reconciledById: ctx.userId,
      reconciledAt: new Date(),
    },
  });
  await audit({
    action: "DELIVERY_CASH_RECONCILED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { submissionId: sub.id, decision: parsed.data.decision },
  });
  revalidatePath(`/${slug}/deliveries`);
  return { ok: true, data: { submissionId: sub.id } };
}
