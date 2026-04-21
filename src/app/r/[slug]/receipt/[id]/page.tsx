import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ReceiptView } from "@/components/orders/receipt-view";

export const dynamic = "force-dynamic";

export default async function CustomerReceiptPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      tenant: { slug: params.slug, deletedAt: null },
    },
    include: {
      table: { select: { label: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: { select: { modifierNameSnap: true, priceDeltaCents: true } } },
      },
      payments: {
        select: { method: true, amountCents: true, createdAt: true },
      },
      tenant: {
        select: { name: true, contactPhone: true, logoUrl: true, currency: true },
      },
    },
  });
  if (!order) notFound();
  const branch = await prisma.branch.findUnique({
    where: { id: order.branchId },
    select: { name: true, address: true },
  });

  return (
    <div className="bg-surface-muted">
      <ReceiptView
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          channel: order.channel,
          status: order.status,
          tableLabel: order.table?.label ?? null,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          createdAt: order.createdAt.toISOString(),
          notes: order.notes,
          subtotalCents: order.subtotalCents,
          discountCents: order.discountCents,
          taxCents: order.taxCents,
          serviceCents: order.serviceCents,
          tipCents: order.tipCents,
          deliveryChargeCents: order.deliveryChargeCents,
          totalCents: order.totalCents,
          items: order.items.map((it) => ({
            qty: it.quantity,
            name: it.itemNameSnap,
            variant: it.variantNameSnap,
            modifiers: it.modifiers.map((m) => ({
              name: m.modifierNameSnap,
              priceCents: m.priceDeltaCents,
            })),
            notes: it.notes,
            lineTotalCents: it.lineTotalCents,
          })),
          payments: order.payments.map((p) => ({
            method: p.method,
            amountCents: p.amountCents,
            at: p.createdAt.toISOString(),
          })),
        }}
        tenant={{
          name: order.tenant.name,
          phone: order.tenant.contactPhone,
          logoUrl: order.tenant.logoUrl,
          currency: order.tenant.currency,
        }}
        branch={
          branch
            ? {
                name: branch.name,
                address: branch.address ?? "",
              }
            : null
        }
      />
    </div>
  );
}
