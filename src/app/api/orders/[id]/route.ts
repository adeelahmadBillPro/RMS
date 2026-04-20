import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("tenant");
  if (!slug) return NextResponse.json({ error: "tenant slug required" }, { status: 400 });

  let ctx;
  try {
    ctx = await getTenantContext(slug);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const o = await prisma.order.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: {
      table: { select: { label: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: true },
      },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    channel: o.channel,
    tableLabel: o.table?.label ?? null,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    deliveryAddress: o.deliveryAddress,
    notes: o.notes,
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    serviceCents: o.serviceCents,
    discountCents: o.discountCents,
    tipCents: o.tipCents,
    deliveryChargeCents: o.deliveryChargeCents,
    totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((it) => ({
      id: it.id,
      qty: it.quantity,
      itemName: it.itemNameSnap,
      variantName: it.variantNameSnap,
      unitPriceCents: it.unitPriceCents,
      lineTotalCents: it.lineTotalCents,
      notes: it.notes,
      modifiers: it.modifiers.map((m) => ({
        name: m.modifierNameSnap,
        priceDeltaCents: m.priceDeltaCents,
      })),
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amountCents: p.amountCents,
      reference: p.reference,
      verification: p.verification,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
