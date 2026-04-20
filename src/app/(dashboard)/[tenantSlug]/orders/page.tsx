import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { OrderBoard } from "@/components/orders/order-board";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const orders = await prisma.order.findMany({
    where: {
      tenantId: ctx.tenantId,
      // Show last 24h of activity by default; archive heuristic.
      OR: [
        { status: { in: ["NEW", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } },
        {
          status: { in: ["COMPLETED", "CANCELLED"] },
          createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      table: { select: { label: true } },
      items: { select: { quantity: true, itemNameSnap: true, variantNameSnap: true } },
      payments: true,
    },
  });

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">ORDERS</p>
        <h1 className="mt-1 text-h1">Orders</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {orders.length} active or recent orders.
        </p>
      </header>

      {orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt className="h-5 w-5" />}
            title="No orders yet"
            description="Open the POS to take your first order, or wait for a public/QR order to come in."
          />
        </Card>
      ) : (
        <OrderBoard
          slug={params.tenantSlug}
          tenantId={ctx.tenantId}
          canManage={canManage}
          orders={orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            channel: o.channel,
            totalCents: o.totalCents,
            tableLabel: o.table?.label ?? null,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            createdAt: o.createdAt.toISOString(),
            items: o.items.map((it) => ({
              qty: it.quantity,
              itemName: it.itemNameSnap,
              variantName: it.variantNameSnap,
            })),
            paidCents: o.payments.reduce((s, p) => s + p.amountCents, 0),
          }))}
        />
      )}
    </div>
  );
}
