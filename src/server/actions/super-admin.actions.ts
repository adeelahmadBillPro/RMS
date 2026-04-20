"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireSuperAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { extendTrialSchema, impersonateTenantSchema } from "@/lib/validations/super-admin.schema";
import type { ActionResult } from "./auth.actions";

export async function startImpersonationAction(
  input: unknown,
): Promise<ActionResult<{ tenantSlug: string }>> {
  const session = await requireSuperAdmin();
  const parsed = impersonateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.data.tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant) return { ok: false, error: "Tenant not found" };

  await audit({
    action: "IMPERSONATION_STARTED",
    tenantId: tenant.id,
    userId: session.user.id,
    metadata: { reason: parsed.data.reason },
  });

  revalidatePath("/super-admin");
  // Phase 1: we record the audit event; full session-swap is Phase 2.
  return { ok: true, data: { tenantSlug: tenant.slug } };
}

export async function extendTrialAction(input: unknown): Promise<ActionResult<{ days: number }>> {
  const session = await requireSuperAdmin();
  const parsed = extendTrialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const sub = await prisma.subscription.findUnique({
    where: { tenantId: parsed.data.tenantId },
  });
  if (!sub) return { ok: false, error: "Tenant has no subscription record" };

  const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + parsed.data.days);

  await prisma.subscription.update({
    where: { tenantId: parsed.data.tenantId },
    data: { trialEndsAt: next, currentPeriodEnd: next, status: "TRIALING" },
  });

  await audit({
    action: "TRIAL_EXTENDED",
    tenantId: parsed.data.tenantId,
    userId: session.user.id,
    metadata: { days: parsed.data.days, newTrialEnd: next.toISOString() },
  });

  revalidatePath("/super-admin");
  return { ok: true, data: { days: parsed.data.days } };
}
