import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageX, Phone } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { OrderTrackingClient } from "@/components/customer/order-tracking-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CustomerOrderTrackingPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  // Resolve tenant first so we can render a friendly fallback even if the
  // order vanishes / never existed (link from old SMS, typo, etc).
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { id: true, name: true, contactPhone: true },
  });
  if (!tenant) notFound();

  const order = await prisma.order.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      table: { select: { label: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: { select: { modifierNameSnap: true } } },
      },
      tenant: { select: { id: true, name: true, contactPhone: true } },
    },
  });
  if (!order) {
    return (
      <div className="container max-w-md py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-subtle text-warning">
          <PackageX className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-h2">Order not found</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          We couldn’t find this order at {tenant.name}. It may have been removed,
          or the link could be incorrect.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button asChild>
            <Link href={`/r/${params.slug}/track`}>Track by order # + phone</Link>
          </Button>
          {tenant.contactPhone ? (
            <a
              href={`tel:${tenant.contactPhone}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" /> Call {tenant.contactPhone}
            </a>
          ) : null}
          <Button asChild variant="ghost">
            <Link href={`/r/${params.slug}`}>Back to menu</Link>
          </Button>
        </div>
      </div>
    );
  }

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
      <div className="mt-8 flex items-center justify-center gap-2">
        <Button asChild variant="ghost">
          <Link href={`/r/${params.slug}/menu`}>← Browse more</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/r/${params.slug}/receipt/${order.id}`}>View receipt</Link>
        </Button>
      </div>
    </div>
  );
}
