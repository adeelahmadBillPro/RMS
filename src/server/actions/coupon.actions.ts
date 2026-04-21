"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import {
  createCouponSchema,
  validateCouponSchema,
} from "@/lib/validations/coupon.schema";
import type { ActionResult } from "./auth.actions";

/**
 * Tenant-side: create a coupon. Owner / Manager only.
 */
export async function createCouponAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "MANAGER") {
    return { ok: false, error: "Only owners and managers can manage coupons." };
  }
  const parsed = createCouponSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path.join(".") || "_form";
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const code = d.code.toUpperCase();

  // Conflict check (better error than relying on the unique constraint).
  const existing = await prisma.coupon.findFirst({
    where: { tenantId: ctx.tenantId, code, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Code "${code}" is already in use.`, fieldErrors: { code: "Already used" } };
  }

  const created = await prisma.coupon.create({
    data: {
      tenantId: ctx.tenantId,
      code,
      type: d.type,
      percentBps: d.type === "PERCENT_OFF" && d.percent ? Math.round(d.percent * 100) : null,
      flatOffCents: d.type === "FLAT_OFF" && d.flatRupees ? d.flatRupees * 100 : null,
      maxDiscountCents:
        d.type === "PERCENT_OFF" && d.maxDiscountRupees ? d.maxDiscountRupees * 100 : null,
      minOrderCents: (d.minOrderRupees ?? 0) * 100,
      maxRedemptions: d.maxRedemptions ?? null,
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      isActive: d.isActive,
    },
  });

  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "coupons", op: "create", id: created.id, code },
  });
  revalidatePath(`/${slug}/coupons`);
  return { ok: true, data: { id: created.id } };
}

/** Toggle active flag. */
export async function setCouponActiveAction(
  slug: string,
  couponId: string,
  isActive: boolean,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "MANAGER") {
    return { ok: false, error: "Not allowed." };
  }
  const c = await prisma.coupon.findFirst({
    where: { id: couponId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, code: true },
  });
  if (!c) return { ok: false, error: "Coupon not found." };
  await prisma.coupon.update({ where: { id: c.id }, data: { isActive } });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "coupons", op: isActive ? "enable" : "disable", id: c.id, code: c.code },
  });
  revalidatePath(`/${slug}/coupons`);
  return { ok: true, data: null };
}

/** Soft delete. */
export async function deleteCouponAction(
  slug: string,
  couponId: string,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER") {
    return { ok: false, error: "Only the owner can delete coupons." };
  }
  await prisma.coupon.updateMany({
    where: { id: couponId, tenantId: ctx.tenantId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "coupons", op: "delete", id: couponId },
  });
  revalidatePath(`/${slug}/coupons`);
  return { ok: true, data: null };
}

/**
 * Public: validate a coupon code against an in-progress cart.
 * Returns the discount that would apply (in cents) plus a friendly label.
 *
 * NB: this is preview-only. The real discount is recomputed server-side
 * when the order is placed (see resolveCouponForOrder below) so we can't
 * be cheated by a stale UI state.
 */
export async function validateCouponAction(
  input: unknown,
): Promise<
  ActionResult<{
    code: string;
    type: "PERCENT_OFF" | "FLAT_OFF" | "FREE_DELIVERY";
    discountCents: number;
    description: string;
  }>
> {
  const parsed = validateCouponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Bad input." };
  }
  const data = parsed.data;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: data.slug, deletedAt: null },
    select: { id: true, deliveryFeeCents: true },
  });
  if (!tenant) return { ok: false, error: "Restaurant not found." };

  const result = await previewCoupon({
    tenantId: tenant.id,
    code: data.code.toUpperCase(),
    subtotalCents: data.subtotalCents,
    channel: data.channel,
    deliveryFeeCents: tenant.deliveryFeeCents,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    data: {
      code: result.coupon.code,
      type: result.coupon.type,
      discountCents: result.discountCents,
      description: result.description,
    },
  };
}

/**
 * Pure helper used by both validateCouponAction (preview) and the order
 * placement transaction (server-of-record). Single source of truth for
 * "what does this code do to this cart".
 */
export async function previewCoupon(args: {
  tenantId: string;
  code: string;
  subtotalCents: number;
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
  deliveryFeeCents: number;
}): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      coupon: { id: string; code: string; type: "PERCENT_OFF" | "FLAT_OFF" | "FREE_DELIVERY" };
      discountCents: number;
      description: string;
    }
> {
  const c = await prisma.coupon.findFirst({
    where: {
      tenantId: args.tenantId,
      code: args.code,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!c) return { ok: false, error: "Code not found or expired." };

  const now = new Date();
  if (c.validFrom > now) return { ok: false, error: "This code isn’t live yet." };
  if (c.validUntil && c.validUntil < now) return { ok: false, error: "This code has expired." };
  if (c.maxRedemptions != null && c.redemptionsCount >= c.maxRedemptions) {
    return { ok: false, error: "This code has been fully redeemed." };
  }
  if (args.subtotalCents < c.minOrderCents) {
    const need = Math.round(c.minOrderCents / 100);
    return { ok: false, error: `Minimum order Rs ${need} for this code.` };
  }

  let discountCents = 0;
  let description = "";
  if (c.type === "PERCENT_OFF") {
    const pct = (c.percentBps ?? 0) / 10_000;
    discountCents = Math.floor(args.subtotalCents * pct);
    if (c.maxDiscountCents != null) {
      discountCents = Math.min(discountCents, c.maxDiscountCents);
    }
    description = `${((c.percentBps ?? 0) / 100).toFixed(0)}% off your order`;
  } else if (c.type === "FLAT_OFF") {
    discountCents = Math.min(c.flatOffCents ?? 0, args.subtotalCents);
    description = `Rs ${Math.round(discountCents / 100)} off`;
  } else if (c.type === "FREE_DELIVERY") {
    if (args.channel !== "DELIVERY") {
      return { ok: false, error: "This code only works on delivery orders." };
    }
    discountCents = args.deliveryFeeCents;
    description = "Free delivery";
  }

  if (discountCents <= 0) {
    return { ok: false, error: "This code doesn’t apply to your cart." };
  }

  return {
    ok: true,
    coupon: { id: c.id, code: c.code, type: c.type },
    discountCents,
    description,
  };
}

/**
 * Used by placePublicOrderAction inside the order transaction. Increments
 * the redemption counter atomically and writes the audit row.
 *
 * Returns the discount cents to subtract from totals, or 0 if the code
 * was invalid (caller decides whether to fail the order or just ignore).
 */
export async function applyCouponInTx(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    code: string;
    subtotalCents: number;
    channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
    deliveryFeeCents: number;
    orderId: string;
  },
): Promise<number> {
  // Re-evaluate inside the transaction so we don't honor a stale code.
  const c = await tx.coupon.findFirst({
    where: {
      tenantId: args.tenantId,
      code: args.code,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!c) return 0;

  const now = new Date();
  if (c.validFrom > now) return 0;
  if (c.validUntil && c.validUntil < now) return 0;
  if (c.maxRedemptions != null && c.redemptionsCount >= c.maxRedemptions) return 0;
  if (args.subtotalCents < c.minOrderCents) return 0;

  let discountCents = 0;
  if (c.type === "PERCENT_OFF") {
    const pct = (c.percentBps ?? 0) / 10_000;
    discountCents = Math.floor(args.subtotalCents * pct);
    if (c.maxDiscountCents != null) discountCents = Math.min(discountCents, c.maxDiscountCents);
  } else if (c.type === "FLAT_OFF") {
    discountCents = Math.min(c.flatOffCents ?? 0, args.subtotalCents);
  } else if (c.type === "FREE_DELIVERY") {
    if (args.channel !== "DELIVERY") return 0;
    discountCents = args.deliveryFeeCents;
  }
  if (discountCents <= 0) return 0;

  await tx.coupon.update({
    where: { id: c.id },
    data: { redemptionsCount: { increment: 1 } },
  });
  await tx.couponRedemption.create({
    data: {
      couponId: c.id,
      tenantId: args.tenantId,
      orderId: args.orderId,
      discountCents,
    },
  });

  return discountCents;
}
