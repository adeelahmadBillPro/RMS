"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { rupeesToPaisa } from "@/lib/utils";
import {
  dealCreateSchema,
  dealDeleteSchema,
  dealUpdateSchema,
} from "@/lib/validations/deal.schema";
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

export async function createDealAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can create deals." };
  const parsed = dealCreateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  const data = parsed.data;

  const deal = await prisma.deal.create({
    data: {
      tenantId: ctx.tenantId,
      title: data.title,
      subtitle: data.subtitle || null,
      type: data.type,
      percentBps: data.type === "PERCENT_OFF" ? data.percentBps ?? null : null,
      flatOffCents:
        data.type === "FLAT_OFF" && data.flatOffRupees != null
          ? rupeesToPaisa(data.flatOffRupees)
          : null,
      minOrderCents: rupeesToPaisa(data.minOrderRupees),
      heroImageUrl: data.heroImageUrl || null,
      bgColor: data.bgColor || null,
      ctaLabel: data.ctaLabel || null,
      startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "deal", op: "create", id: deal.id, title: deal.title },
  });
  revalidatePath(`/${slug}/deals`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: { id: deal.id } };
}

export async function updateDealAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = dealUpdateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  const data = parsed.data;

  const existing = await prisma.deal.findFirst({
    where: { id: data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Deal not found." };

  await prisma.deal.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      subtitle: data.subtitle || null,
      type: data.type,
      percentBps: data.type === "PERCENT_OFF" ? data.percentBps ?? null : null,
      flatOffCents:
        data.type === "FLAT_OFF" && data.flatOffRupees != null
          ? rupeesToPaisa(data.flatOffRupees)
          : null,
      minOrderCents: rupeesToPaisa(data.minOrderRupees),
      heroImageUrl: data.heroImageUrl || null,
      bgColor: data.bgColor || null,
      ctaLabel: data.ctaLabel || null,
      startsAt: data.startsAt ? new Date(data.startsAt) : existing.startsAt,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });
  revalidatePath(`/${slug}/deals`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: { id: existing.id } };
}

export async function deleteDealAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER")
    return { ok: false, error: "Only owners can delete deals." };
  const parsed = dealDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const existing = await prisma.deal.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Deal not found." };
  await prisma.deal.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePath(`/${slug}/deals`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}
