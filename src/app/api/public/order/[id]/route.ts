import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * Public, no-auth read of a single order.
 *
 * Relies on the cuid being the secret — cuids are 24 chars / ~128 bits,
 * sufficiently unguessable that the URL itself is the token. Returns a
 * trimmed payload (no internal ids, no user references).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const order = await prisma.order.findFirst({
    where: { id: params.id },
    include: {
      table: { select: { label: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: { select: { modifierNameSnap: true } } },
      },
      tenant: { select: { slug: true, name: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Rough ETA: max prepTime of line items (we don't have a prepTime column on
  // snapshot, so approximate by multiplying item count * 2 minutes + 5 base).
  const itemsTotal = order.items.reduce((s, it) => s + it.quantity, 0);
  const etaMinutes = Math.min(45, 5 + Math.ceil(itemsTotal * 2));

  return NextResponse.json({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    channel: order.channel,
    tableLabel: order.table?.label ?? null,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    etaMinutes,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    serviceCents: order.serviceCents,
    deliveryChargeCents: order.deliveryChargeCents,
    totalCents: order.totalCents,
    tenantName: order.tenant.name,
    tenantSlug: order.tenant.slug,
    items: order.items.map((it) => ({
      qty: it.quantity,
      itemName: it.itemNameSnap,
      variantName: it.variantNameSnap,
      modifiers: it.modifiers.map((m) => m.modifierNameSnap),
      lineTotalCents: it.lineTotalCents,
    })),
  });
}
