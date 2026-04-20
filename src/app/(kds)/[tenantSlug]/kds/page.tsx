import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { KDSBoard } from "@/components/kds/kds-board";

export const dynamic = "force-dynamic";

export default async function KDSPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const orders = await prisma.order.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ["NEW", "PREPARING"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      table: { select: { label: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: { select: { modifierNameSnap: true } } },
      },
    },
  });

  return (
    <KDSBoard
      slug={params.tenantSlug}
      tenantId={ctx.tenantId}
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status as "NEW" | "PREPARING",
        channel: o.channel,
        tableLabel: o.table?.label ?? null,
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((it) => ({
          id: it.id,
          qty: it.quantity,
          itemName: it.itemNameSnap,
          variantName: it.variantNameSnap,
          notes: it.notes,
          modifiers: it.modifiers.map((m) => m.modifierNameSnap),
        })),
      }))}
    />
  );
}
