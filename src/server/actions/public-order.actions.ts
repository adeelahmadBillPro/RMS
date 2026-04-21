"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { rateLimit } from "@/lib/rate-limit";
import { computeTotals, type CartLine } from "@/lib/orders/cart";
import { realtime, REALTIME_EVENTS, tenantChannel } from "@/lib/realtime";
import { getSession } from "@/lib/auth/session";
import { publicOrderSchema } from "@/lib/validations/public-order.schema";
import { addressCoveredByAreas } from "@/lib/validations/delivery-zones.schema";
import type { ActionResult } from "./auth.actions";

/**
 * Customer-facing order creation (no auth).
 *
 * Tenant slug from URL (NEVER trusted from request body, but the schema
 * accepts it for explicit binding); tableQr resolves to a real Table only
 * if it belongs to this tenant + an active branch.
 *
 * Rate-limited per phone + per IP (master prompt §7.6).
 */
export async function placePublicOrderAction(
  input: unknown,
): Promise<ActionResult<{ orderNumber: number; trackingId: string }>> {
  const parsed = publicOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path.join(".") || "_form";
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  const session = await getSession();
  const customerUserId = session?.user?.id ?? null;

  // Resolve tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: data.slug, deletedAt: null } as { slug: string; deletedAt: Date | null },
    select: {
      id: true,
      name: true,
      hasDelivery: true,
      hasTakeaway: true,
      deliveryAreas: true,
      deliveryFeeCents: true,
      deliveryMinOrderCents: true,
    },
  });
  if (!tenant) return { ok: false, error: "Restaurant not found." };
  if (data.channel === "DELIVERY" && !tenant.hasDelivery)
    return { ok: false, error: "This restaurant doesn’t do delivery." };
  if (data.channel === "TAKEAWAY" && !tenant.hasTakeaway)
    return { ok: false, error: "This restaurant doesn’t do takeaway." };

  // Zone check — only when delivering + tenant has configured allow-list
  if (data.channel === "DELIVERY" && tenant.deliveryAreas.length > 0) {
    if (!data.deliveryAddress || !addressCoveredByAreas(data.deliveryAddress, tenant.deliveryAreas)) {
      return {
        ok: false,
        error: `Sorry, we don't deliver to that address yet. We currently serve: ${tenant.deliveryAreas.join(", ")}.`,
        fieldErrors: { deliveryAddress: "Out of our delivery zone" },
      };
    }
  }

  // Rate limit: 10 orders per phone per hour, 30 per IP per hour
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers().get("x-real-ip") ?? "anon";
  const phoneKey = `public-order/phone/${tenant.id}/${data.customerPhone}`;
  const ipKey = `public-order/ip/${tenant.id}/${ip}`;
  const phoneCheck = rateLimit(phoneKey, 10, 60 * 60_000);
  if (!phoneCheck.ok)
    return { ok: false, error: "Too many orders from this number — try again in an hour." };
  const ipCheck = rateLimit(ipKey, 30, 60 * 60_000);
  if (!ipCheck.ok) return { ok: false, error: "Too many requests — try again later." };

  // Resolve table (DINE_IN only)
  let tableId: string | null = null;
  let branchId: string | null = null;
  if (data.tableQr) {
    const table = await prisma.restaurantTable.findFirst({
      where: { qrCode: data.tableQr, tenantId: tenant.id, deletedAt: null },
      select: { id: true, branchId: true },
    });
    if (!table) return { ok: false, error: "Table not found." };
    tableId = table.id;
    branchId = table.branchId;
  }
  if (!branchId) {
    // Pick the primary branch (or any active branch) for non-QR orders.
    const b = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, deletedAt: null, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!b) return { ok: false, error: "No active branches." };
    branchId = b.id;
  }

  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: branchId },
    select: { id: true, taxBps: true, serviceBps: true },
  });

  // Snapshot variants + modifiers (server-priced)
  const variantIds = Array.from(new Set(data.items.map((i) => i.variantId)));
  const variants = await prisma.menuVariant.findMany({
    where: {
      id: { in: variantIds },
      deletedAt: null,
      isAvailable: true,
      item: { tenantId: tenant.id, isAvailable: true, deletedAt: null },
    },
    include: { item: { select: { id: true, name: true } } },
  });
  if (variants.length !== variantIds.length)
    return { ok: false, error: "Some items are unavailable. Refresh and try again." };

  const modifierIds = Array.from(new Set(data.items.flatMap((i) => i.modifierIds)));
  const modifiers = modifierIds.length
    ? await prisma.modifier.findMany({
        where: {
          id: { in: modifierIds },
          deletedAt: null,
          isAvailable: true,
          group: { item: { tenantId: tenant.id } },
        },
      })
    : [];
  if (modifiers.length !== modifierIds.length)
    return { ok: false, error: "Some add-ons are unavailable." };

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

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

  const deliveryChargeCents = data.channel === "DELIVERY" ? tenant.deliveryFeeCents : 0;
  // Cap tip server-side to a sane multiple of the subtotal so a hostile client
  // can't post a 9_999_999 tip and trigger weird invoice/audit edges.
  const subtotalForCap = lines.reduce(
    (s, l) =>
      s +
      (l.unitPriceCents + l.modifiers.reduce((m, x) => m + x.priceDeltaCents, 0)) * l.quantity,
    0,
  );
  const requestedTip = Math.max(0, Math.floor(data.tipCents ?? 0));
  const tipCents = Math.min(requestedTip, subtotalForCap * 2);
  const totals = computeTotals({
    lines,
    taxBps: branch.taxBps,
    serviceBps: branch.serviceBps,
    deliveryChargeCents,
    tipCents,
  });
  if (
    data.channel === "DELIVERY" &&
    tenant.deliveryMinOrderCents > 0 &&
    totals.subtotalCents < tenant.deliveryMinOrderCents
  ) {
    const minRupees = Math.round(tenant.deliveryMinOrderCents / 100);
    return {
      ok: false,
      error: `Minimum delivery order is Rs ${minRupees}. Add a bit more to check out.`,
    };
  }

  // Idempotency
  const existing = await prisma.order.findFirst({
    where: { tenantId: tenant.id, idempotencyKey: data.idempotencyKey },
    select: { id: true, orderNumber: true },
  });
  if (existing)
    return { ok: true, data: { orderNumber: existing.orderNumber, trackingId: existing.id } };

  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const nextNumber = (last?.orderNumber ?? 0) + 1;

    // Customer upsert
    const customer = await tx.customer.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: data.customerPhone } },
      update: { name: data.customerName },
      create: { tenantId: tenant.id, phone: data.customerPhone, name: data.customerName },
    });

    const created = await tx.order.create({
      data: {
        tenantId: tenant.id,
        branchId: branchId!,
        channel: data.channel,
        status: "NEW",
        orderNumber: nextNumber,
        tableId,
        customerId: customer.id,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        deliveryAddress: data.channel === "DELIVERY" ? data.deliveryAddress! : null,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        serviceCents: totals.serviceCents,
        discountCents: totals.discountCents,
        tipCents: totals.tipCents,
        deliveryChargeCents: totals.deliveryChargeCents,
        totalCents: totals.totalCents,
        notes: data.notes || null,
        idempotencyKey: data.idempotencyKey,
        createdById: null, // public order
        customerUserId,
      },
    });

    for (const line of lines) {
      const modSum = line.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
      const lineTotal = (line.unitPriceCents + modSum) * line.quantity;
      const oi = await tx.orderItem.create({
        data: {
          orderId: created.id,
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
      data: { orderId: created.id, fromStatus: null, toStatus: "NEW" },
    });

    if (tableId) {
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
    }

    return created;
  });

  await audit({
    action: "ORDER_CREATED",
    tenantId: tenant.id,
    userId: null,
    metadata: { orderId: order.id, orderNumber: order.orderNumber, source: "public" },
  });
  await realtime.trigger(tenantChannel(tenant.id), REALTIME_EVENTS.ORDER_CREATED, {
    id: order.id,
    orderNumber: order.orderNumber,
    branchId: order.branchId,
    status: order.status,
  });
  revalidatePath(`/${data.slug}/orders`);
  revalidatePath(`/${data.slug}/kds`);
  return { ok: true, data: { orderNumber: order.orderNumber, trackingId: order.id } };
}

/**
 * Customer-side cancellation. Allowed only while the kitchen hasn't started
 * cooking (status === "NEW"). Identity is established by either the logged-in
 * customer's user id, or by matching the phone number that placed the order.
 */
export async function cancelPublicOrderAction(input: {
  slug: string;
  orderId: string;
  phone?: string;
}): Promise<ActionResult<null>> {
  if (!input?.orderId || !input?.slug) {
    return { ok: false, error: "Missing order." };
  }
  const session = await getSession();
  const tenant = await prisma.tenant.findFirst({
    where: { slug: input.slug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return { ok: false, error: "Restaurant not found." };

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, tenantId: tenant.id },
    select: {
      id: true,
      status: true,
      customerPhone: true,
      customerUserId: true,
      orderNumber: true,
    },
  });
  if (!order) return { ok: false, error: "Order not found." };

  // Identity: must match either the logged-in user's id or the order phone.
  const matchesUser = !!session?.user?.id && session.user.id === order.customerUserId;
  const matchesPhone =
    !!input.phone && input.phone.replace(/\s+/g, "") === (order.customerPhone ?? "").replace(/\s+/g, "");
  if (!matchesUser && !matchesPhone) {
    return { ok: false, error: "We can’t verify this is your order. Use your phone to confirm." };
  }

  if (order.status !== "NEW") {
    return {
      ok: false,
      error:
        order.status === "CANCELLED"
          ? "This order is already cancelled."
          : "The kitchen has already started — please call the restaurant to cancel.",
    };
  }

  const now = new Date();
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      cancelReason: "Cancelled by customer",
    },
  });
  await audit({
    action: "ORDER_CANCELLED",
    tenantId: tenant.id,
    userId: session?.user?.id ?? null,
    metadata: { orderId: order.id, orderNumber: order.orderNumber, source: "customer" },
  });
  await realtime.trigger(tenantChannel(tenant.id), REALTIME_EVENTS.ORDER_UPDATED, {
    id: order.id,
    status: "CANCELLED",
  });
  revalidatePath(`/r/${input.slug}/order/${order.id}`);
  revalidatePath(`/${input.slug}/orders`);
  revalidatePath(`/${input.slug}/kds`);
  return { ok: true, data: null };
}
