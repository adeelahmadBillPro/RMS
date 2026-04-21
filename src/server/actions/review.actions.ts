"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenant/context";
import { audit } from "@/lib/audit/log";
import {
  reviewCreateSchema,
  reviewHideSchema,
  reviewReplySchema,
} from "@/lib/validations/review.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function canModerate(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

/** Customer-side — write or update your review for a tenant. */
export async function submitReviewAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user) return { ok: false, error: "Please log in to leave a review." };
  const parsed = reviewCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return { ok: false, error: "Restaurant not found." };

  if (d.orderId) {
    // Verify the order belongs to this tenant and this user.
    const order = await prisma.order.findFirst({
      where: { id: d.orderId, tenantId: tenant.id, customerUserId: session.user.id },
      select: { id: true, status: true },
    });
    if (!order) return { ok: false, error: "Order not found." };
    if (order.status !== "COMPLETED")
      return { ok: false, error: "You can only review completed orders." };
  }

  const existing = await prisma.review.findFirst({
    where: {
      tenantId: tenant.id,
      userId: session.user.id,
      orderId: d.orderId ?? null,
    },
    select: { id: true },
  });
  const review = existing
    ? await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: d.rating,
          title: d.title || null,
          body: d.body || null,
        },
      })
    : await prisma.review.create({
        data: {
          tenantId: tenant.id,
          userId: session.user.id,
          orderId: d.orderId ?? null,
          rating: d.rating,
          title: d.title || null,
          body: d.body || null,
        },
      });

  revalidatePath(`/r/${slug}`);
  return { ok: true, data: { id: review.id } };
}

/** Owner/Manager — reply publicly to a review. */
export async function replyToReviewAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canModerate(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = reviewReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reply." };
  const existing = await prisma.review.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId },
  });
  if (!existing) return { ok: false, error: "Review not found." };
  await prisma.review.update({
    where: { id: existing.id },
    data: { ownerReply: parsed.data.reply, ownerRepliedAt: new Date() },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "review", op: "reply", id: existing.id },
  });
  revalidatePath(`/${slug}/reviews`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}

/** Owner/Manager — hide/unhide an inappropriate review. */
export async function setReviewHiddenAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canModerate(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = reviewHideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const existing = await prisma.review.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId },
  });
  if (!existing) return { ok: false, error: "Review not found." };
  await prisma.review.update({
    where: { id: existing.id },
    data: { isHidden: parsed.data.hidden },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "review", op: parsed.data.hidden ? "hide" : "show", id: existing.id },
  });
  revalidatePath(`/${slug}/reviews`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}
