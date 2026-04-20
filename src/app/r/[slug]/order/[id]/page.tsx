import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { OrderTrackingClient } from "@/components/customer/order-tracking-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CustomerOrderTrackingPage({
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
        include: { modifiers: { select: { modifierNameSnap: true } } },
      },
      tenant: { select: { id: true, name: true, contactPhone: true } },
    },
  });
  if (!order) notFound();

  const itemsTotal = order.items.reduce((s, it) => s + it.quantity, 0);
  const etaMinutes = Math.min(45, 5 + Math.ceil(itemsTotal * 2));

  return (
    <div className="container max-w-2xl py-8">
      <OrderTrackingClient
        slug={params.slug}
        tenantId={order.tenant.id}
        initial={{
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
          tenantSlug: params.slug,
          items: order.items.map((it) => ({
            qty: it.quantity,
            itemName: it.itemNameSnap,
            variantName: it.variantNameSnap,
            modifiers: it.modifiers.map((m) => m.modifierNameSnap),
            lineTotalCents: it.lineTotalCents,
          })),
        }}
      />
      <div className="mt-8 text-center">
        <Button asChild variant="ghost">
          <Link href={`/r/${params.slug}/menu`}>← Browse more</Link>
        </Button>
      </div>
    </div>
  );
}
