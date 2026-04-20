"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { rupeesToPaisa } from "@/lib/utils";
import { computeTotals, type CartLine } from "@/lib/orders/cart";
import { deductStockForOrder } from "@/lib/orders/stock-deduct";
import { realtime, REALTIME_EVENTS, tenantChannel } from "@/lib/realtime";
import {
  createOrderSchema,
  orderCancelSchema,
  orderStatusUpdateSchema,
  recordPaymentSchema,
} from "@/lib/validations/order.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const ALL_ROLES = ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "DELIVERY"] as const;
function canTakeOrders(role: string) {
  return role === "OWNER" || role === "MANAGER" || role === "CASHIER" || role === "WAITER";
}
function canChangeStatus(role: string) {
  return ALL_ROLES.includes(role as (typeof ALL_ROLES)[number]);
}
function canCancel(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

export async function createOrderAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ orderId: string; orderNumber: number }>> {
  const ctx = await getTenantContext(slug);
  if (!canTakeOrders(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Idempotency: same key returns the existing order.
  const existing = await prisma.order.findFirst({
    where: { tenantId: ctx.tenantId, idempotencyKey: data.idempotencyKey },
    select: { id: true, orderNumber: true },
  });
  if (existing) return { ok: true, data: { orderId: existing.id, orderNumber: existing.orderNumber } };

  // Verify branch + table belong to tenant
  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, tenantId: ctx.tenantId, deletedAt: null, isActive: true },
    select: { id: true, taxBps: true, serviceBps: true },
  });
  if (!branch) return { ok: false, error: "Branch not found." };

  if (data.tableId) {
    const t = await prisma.restaurantTable.findFirst({
      where: { id: data.tableId, tenantId: ctx.tenantId, branchId: data.branchId, deletedAt: null },
      select: { id: true },
    });
    if (!t) return { ok: false, error: "Table not found.", fieldErrors: { tableId: "Pick another table" } };
  }

  // Load all the variants the order references (in one query) and snapshot prices
  const variantIds = Array.from(new Set(data.items.map((i) => i.variantId)));
  const variants = await prisma.menuVariant.findMany({
    where: { id: { in: variantIds }, deletedAt: null, item: { tenantId: ctx.tenantId } },
    select: {
      id: true,
      name: true,
      priceCents: true,
      isAvailable: true,
      item: { select: { id: true, name: true, isAvailable: true, tenantId: true } },
    },
  });
  if (variants.length !== variantIds.length)
    return { ok: false, error: "One or more menu items are not in this tenant." };
  const unavailable = variants.find((v) => !v.isAvailable || !v.item.isAvailable);
  if (unavailable)
    return { ok: false, error: `“${unavailable.item.name} (${unavailable.name})” is not available right now.` };

  // Modifiers — snapshot price deltas
  const allModifierIds = Array.from(
    new Set(data.items.flatMap((i) => i.modifierIds)),
  );
  const modifiers = allModifierIds.length
    ? await prisma.modifier.findMany({
        where: {
          id: { in: allModifierIds },
          deletedAt: null,
          group: { item: { tenantId: ctx.tenantId } },
        },
        select: { id: true, name: true, priceDeltaCents: true, isAvailable: true },
      })
    : [];
  if (modifiers.length !== allModifierIds.length)
    return { ok: false, error: "One or more modifiers are not in this tenant." };
  const offModifier = modifiers.find((m) => !m.isAvailable);
  if (offModifier) return { ok: false, error: `Modifier “${offModifier.name}” is not available.` };

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

  // Build cart lines (server-side; never trust client totals)
  const lines: CartLine[] = data.items.map((it) => {
    const v = variantMap.get(it.variantId)!;
    const lineMods = it.modifierIds.map((id) => {
      const m = modifierMap.get(id)!;
      return { modifierId: m.id, modifierNameSnap: m.name, priceDeltaCents: m.priceDeltaCents };
    });
    return {
      lineKey: `${v.id}::${[...it.modifierIds].sort().join(",")}`,
      menuItemId: v.item.id,
      variantId: v.id,
      itemNameSnap: v.item.name,
      variantNameSnap: v.name,
      unitPriceCents: v.priceCents,
      quantity: it.quantity,
      notes: it.notes ?? "",
      modifiers: lineMods,
    };
  });

  const totals = computeTotals({
    lines,
    taxBps: branch.taxBps,
    serviceBps: branch.serviceBps,
    discountCents: data.discountCents,
    tipCents: data.tipCents,
    deliveryChargeCents: data.deliveryChargeCents,
  });

  const created = await prisma.$transaction(async (tx) => {
    // Sequential per-tenant order number
    const last = await tx.order.findFirst({
      where: { tenantId: ctx.tenantId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const nextNumber = (last?.orderNumber ?? 0) + 1;

    // Customer upsert (only if phone provided)
    let customerId: string | null = null;
    if (data.customerPhone) {
      const c = await tx.customer.upsert({
        where: { tenantId_phone: { tenantId: ctx.tenantId, phone: data.customerPhone } },
        update: { name: data.customerName || undefined },
        create: {
          tenantId: ctx.tenantId,
          phone: data.customerPhone,
          name: data.customerName || null,
        },
      });
      customerId = c.id;
    }

    const order = await tx.order.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: data.branchId,
        channel: data.channel,
        status: "NEW",
        orderNumber: nextNumber,
        tableId: data.tableId || null,
        customerId,
        customerPhone: data.customerPhone || null,
        customerName: data.customerName || null,
        deliveryAddress: data.deliveryAddress || null,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        serviceCents: totals.serviceCents,
        discountCents: totals.discountCents,
        tipCents: totals.tipCents,
        deliveryChargeCents: totals.deliveryChargeCents,
        totalCents: totals.totalCents,
        notes: data.notes || null,
        idempotencyKey: data.idempotencyKey,
        createdById: ctx.userId,
      },
    });

    for (const line of lines) {
      const modSum = line.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
      const lineTotal = (line.unitPriceCents + modSum) * line.quantity;
      const oi = await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: line.menuItemId,
          variantId: line.variantId,
          itemNameSnap: line.itemNameSnap,
          variantNameSnap: line.variantNameSnap,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
          notes: line.notes || null,
          lineTotalCents: lineTotal,
        },
      });
      if (line.modifiers.length) {
        await tx.orderItemModifier.createMany({
          data: line.modifiers.map((m) => ({
            orderItemId: oi.id,
            modifierId: m.modifierId,
            modifierNameSnap: m.modifierNameSnap,
            priceDeltaCents: m.priceDeltaCents,
          })),
        });
      }
    }

    await tx.orderStatusLog.create({
      data: { orderId: order.id, fromStatus: null, toStatus: "NEW", changedById: ctx.userId },
    });

    if (data.tableId) {
      await tx.restaurantTable.update({
        where: { id: data.tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return order;
  });

  await audit({
    action: "ORDER_CREATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { orderId: created.id, orderNumber: created.orderNumber, total: created.totalCents },
  });
  await realtime.trigger(tenantChannel(ctx.tenantId), REALTIME_EVENTS.ORDER_CREATED, {
    id: created.id,
    orderNumber: created.orderNumber,
    branchId: created.branchId,
    status: created.status,
  });

  revalidatePath(`/${slug}/orders`);
  revalidatePath(`/${slug}/kds`);
  return { ok: true, data: { orderId: created.id, orderNumber: created.orderNumber } };
}

const STATUS_ORDER: Record<string, number> = {
  NEW: 0,
  PREPARING: 1,
  READY: 2,
  OUT_FOR_DELIVERY: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

export async function updateOrderStatusAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ orderId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canChangeStatus(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = orderStatusUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: ctx.tenantId },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "CANCELLED" || order.status === "COMPLETED")
    return { ok: false, error: `Order is already ${order.status.toLowerCase()}.` };
  if (parsed.data.toStatus === "CANCELLED")
    return { ok: false, error: "Use cancel action with a reason." };

  const fromIdx = STATUS_ORDER[order.status] ?? 0;
  const toIdx = STATUS_ORDER[parsed.data.toStatus] ?? 0;
  if (toIdx <= fromIdx)
    return { ok: false, error: `Can't move from ${order.status} to ${parsed.data.toStatus}.` };

  // OUT_FOR_DELIVERY only valid on DELIVERY orders
  if (parsed.data.toStatus === "OUT_FOR_DELIVERY" && order.channel !== "DELIVERY")
    return { ok: false, error: "OUT_FOR_DELIVERY is only valid for delivery orders." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: parsed.data.toStatus,
        ...(parsed.data.toStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: parsed.data.toStatus,
        changedById: ctx.userId,
        notes: parsed.data.notes || null,
      },
    });

    // On COMPLETED, deduct ingredient stock (skipped silently for variants without recipes).
    if (parsed.data.toStatus === "COMPLETED") {
      try {
        await deductStockForOrder(tx, {
          tenantId: ctx.tenantId,
          branchId: order.branchId,
          orderId: order.id,
        });
      } catch (err) {
        // Insufficient stock means we've sold what we don't have — log but
        // don't block the cashier from completing the sale (the sale already happened).
        if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
          console.warn(
            `[orders] partial stock deduction on order ${order.id} — investigate`,
          );
        } else {
          throw err;
        }
      }
      // Update customer aggregates
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpentCents: { increment: order.totalCents },
            lastOrderAt: new Date(),
          },
        });
      }
      // Free table on completion (can also happen via explicit table action)
      if (order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: "FREE" },
        });
      }
    }
  });

  await audit({
    action: "ORDER_STATUS_CHANGED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { orderId: order.id, from: order.status, to: parsed.data.toStatus },
  });
  await realtime.trigger(tenantChannel(ctx.tenantId), REALTIME_EVENTS.ORDER_UPDATED, {
    id: order.id,
    status: parsed.data.toStatus,
  });
  revalidatePath(`/${slug}/orders`);
  revalidatePath(`/${slug}/kds`);
  return { ok: true, data: { orderId: order.id } };
}

export async function cancelOrderAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ orderId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canCancel(ctx.membership.role)) return { ok: false, error: "Only owners and managers can cancel orders." };
  const parsed = orderCancelSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: ctx.tenantId },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "COMPLETED" || order.status === "CANCELLED")
    return { ok: false, error: `Order is already ${order.status.toLowerCase()}.` };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: parsed.data.reason,
      },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "CANCELLED",
        changedById: ctx.userId,
        notes: parsed.data.reason,
      },
    });
    if (order.tableId) {
      await tx.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: "FREE" },
      });
    }
  });
  await audit({
    action: "ORDER_CANCELLED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { orderId: order.id, reason: parsed.data.reason },
  });
  await realtime.trigger(tenantChannel(ctx.tenantId), REALTIME_EVENTS.ORDER_UPDATED, {
    id: order.id,
    status: "CANCELLED",
  });
  revalidatePath(`/${slug}/orders`);
  revalidatePath(`/${slug}/kds`);
  return { ok: true, data: { orderId: order.id } };
}

export async function recordPaymentAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ paymentId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canTakeOrders(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, tenantId: ctx.tenantId },
    include: { payments: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  const amountCents = rupeesToPaisa(parsed.data.amountRupees);
  const paid = order.payments.reduce((s, p) => s + p.amountCents, 0);
  if (paid + amountCents > order.totalCents + 100) {
    // Allow up to PKR 1 over for tip/rounding; otherwise reject overpayment.
    return { ok: false, error: "Payment exceeds order total." };
  }

  // Verification: cash + card + split assumed verified at point of sale;
  // gateway methods land as UNVERIFIED until Phase 3 webhooks confirm.
  const verification: Prisma.PaymentCreateInput["verification"] =
    parsed.data.method === "CASH" || parsed.data.method === "CARD"
      ? "VERIFIED"
      : "UNVERIFIED";

  const payment = await prisma.payment.create({
    data: {
      tenantId: ctx.tenantId,
      orderId: order.id,
      method: parsed.data.method,
      amountCents,
      reference: parsed.data.reference || null,
      screenshotUrl: parsed.data.screenshotUrl || null,
      verification,
      recordedById: ctx.userId,
    },
  });
  await audit({
    action: "PAYMENT_RECORDED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { paymentId: payment.id, orderId: order.id, method: payment.method, amountCents },
  });
  revalidatePath(`/${slug}/orders`);
  return { ok: true, data: { paymentId: payment.id } };
}
