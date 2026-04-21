"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { requireSuperAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { requestPlanUpgradeSchema } from "@/lib/validations/billing.schema";
import type { ActionResult } from "./auth.actions";

/**
 * Tenant-side: submit a plan-upgrade request. Records a PlanInvoice with
 * status=PENDING. Super-admin approves it → subscription flips to the new
 * plan. Lifetime purchase sets subscription status=LIFETIME.
 */
export async function requestPlanUpgradeAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ invoiceId: string }>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER")
    return { ok: false, error: "Only the tenant owner can change plans." };

  const parsed = requestPlanUpgradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the form." };
  const d = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { code: d.targetPlanCode } });
  if (!plan || !plan.isActive)
    return { ok: false, error: "That plan is not available." };

  const sub = await prisma.subscription.findUnique({
    where: { tenantId: ctx.tenantId },
  });
  if (!sub) return { ok: false, error: "No active subscription to upgrade." };

  const now = new Date();
  const periodEnd =
    plan.interval === "LIFETIME"
      ? null
      : new Date(now.getTime() + (plan.interval === "YEAR" ? 365 : 30) * 24 * 60 * 60 * 1000);

  const invoice = await prisma.planInvoice.create({
    data: {
      subscriptionId: sub.id,
      tenantId: ctx.tenantId,
      planCode: plan.code,
      periodStart: now,
      periodEnd,
      amountCents: plan.priceCents,
      currency: plan.currency,
      method: d.method,
      status: "PENDING",
      reference: d.reference || null,
      screenshotUrl: d.screenshotUrl || null,
      notes: d.notes || null,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "billing", op: "requestUpgrade", planCode: plan.code, invoiceId: invoice.id },
  });
  revalidatePath(`/${slug}/billing`);
  revalidatePath(`/super-admin/billing`);
  return { ok: true, data: { invoiceId: invoice.id } };
}

/** Super-admin: approve a pending PlanInvoice and flip the subscription. */
export async function approvePlanInvoiceAction(
  invoiceId: string,
): Promise<ActionResult<null>> {
  const session = await requireSuperAdmin();
  const invoice = await prisma.planInvoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "PENDING")
    return { ok: false, error: "Already processed." };

  const plan = await prisma.plan.findUnique({ where: { code: invoice.planCode } });
  if (!plan) return { ok: false, error: "Plan no longer exists." };

  await prisma.$transaction(async (tx) => {
    await tx.planInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
    await tx.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        planId: plan.id,
        status: plan.interval === "LIFETIME" ? "LIFETIME" : "ACTIVE",
        currentPeriodEnd: invoice.periodEnd,
        trialEndsAt: null,
        canceledAt: null,
        lifetimePurchasedAt: plan.interval === "LIFETIME" ? new Date() : null,
      },
    });
  });

  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: invoice.tenantId,
    userId: session.user.id,
    metadata: { module: "billing", op: "approve", invoiceId: invoice.id, planCode: plan.code },
  });
  revalidatePath(`/super-admin/billing`);
  return { ok: true, data: null };
}

/** Super-admin: reject a pending invoice (bad proof, wrong amount, etc). */
export async function rejectPlanInvoiceAction(
  invoiceId: string,
  reason: string,
): Promise<ActionResult<null>> {
  const session = await requireSuperAdmin();
  const invoice = await prisma.planInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "PENDING") return { ok: false, error: "Already processed." };

  await prisma.planInvoice.update({
    where: { id: invoice.id },
    data: {
      status: "FAILED",
      notes: [invoice.notes ?? "", `REJECTED: ${reason}`].filter(Boolean).join("\n"),
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: invoice.tenantId,
    userId: session.user.id,
    metadata: { module: "billing", op: "reject", invoiceId: invoice.id, reason },
  });
  revalidatePath(`/super-admin/billing`);
  return { ok: true, data: null };
}
