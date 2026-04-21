"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { audit } from "@/lib/audit/log";
import {
  tenantChannelsSchema,
  tenantLocaleSchema,
  tenantProfileSchema,
} from "@/lib/validations/tenant-settings.schema";
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

export async function updateTenantProfileAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = tenantProfileSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      name: d.name,
      cuisineType: d.cuisineType,
      contactPhone: d.contactPhone || null,
      logoUrl: d.logoUrl || null,
      brandColor: d.brandColor || null,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "profile" },
  });
  revalidatePath(`/${slug}/settings`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}

export async function updateTenantChannelsAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = tenantChannelsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid channel settings." };
  const d = parsed.data;
  if (!d.hasDelivery && !d.hasTakeaway) {
    return { ok: false, error: "Keep at least one channel enabled (delivery or takeaway)." };
  }
  if (![d.acceptCash, d.acceptCard, d.acceptJazzCash, d.acceptEasypaisa, d.acceptBankTransfer].some(Boolean)) {
    return { ok: false, error: "Enable at least one payment method." };
  }
  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      hasDelivery: d.hasDelivery,
      hasTakeaway: d.hasTakeaway,
      acceptCash: d.acceptCash,
      acceptCard: d.acceptCard,
      acceptJazzCash: d.acceptJazzCash,
      acceptEasypaisa: d.acceptEasypaisa,
      acceptBankTransfer: d.acceptBankTransfer,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "channels" },
  });
  revalidatePath(`/${slug}/settings`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}

export async function updateTenantLocaleAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = tenantLocaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid locale settings." };
  const d = parsed.data;
  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      currency: d.currency,
      timezone: d.timezone,
      locale: d.locale,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "locale" },
  });
  revalidatePath(`/${slug}/settings`);
  return { ok: true, data: null };
}
