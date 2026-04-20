import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { RiderCards } from "@/components/delivery/rider-cards";

export const dynamic = "force-dynamic";

export default async function RiderDeliveriesPage({
  params,
}: {
  params: { tenantSlug: string };
}) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [assignments, pendingCashSummary] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      where: {
        tenantId: ctx.tenantId,
        deliveryUserId: ctx.userId,
        OR: [
          { status: { in: ["ASSIGNED", "PICKED_UP"] } },
          {
            status: "DELIVERED",
            cashSubmissionId: null,
          },
        ],
      },
      orderBy: { assignedAt: "asc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            totalCents: true,
            notes: true,
            items: {
              select: { quantity: true, itemNameSnap: true, variantNameSnap: true },
            },
          },
        },
      },
    }),
    prisma.deliveryAssignment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        deliveryUserId: ctx.userId,
        status: "DELIVERED",
        cashSubmissionId: null,
      },
      _sum: { collectedCashCents: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="container max-w-2xl space-y-4 py-6 pb-24">
      <header>
        <p className="font-mono text-xs text-foreground-muted">YOUR SHIFT</p>
        <h1 className="mt-1 text-h1">My deliveries</h1>
      </header>

      <RiderCards
        slug={params.tenantSlug}
        pendingCashCents={pendingCashSummary._sum.collectedCashCents ?? 0}
        pendingCount={pendingCashSummary._count._all}
        assignments={assignments.map((a) => ({
          id: a.id,
          status: a.status,
          collectedCashCents: a.collectedCashCents,
          assignedAt: a.assignedAt.toISOString(),
          order: {
            id: a.order.id,
            orderNumber: a.order.orderNumber,
            customerName: a.order.customerName,
            customerPhone: a.order.customerPhone,
            deliveryAddress: a.order.deliveryAddress,
            totalCents: a.order.totalCents,
            notes: a.order.notes,
            items: a.order.items.map((it) => ({
              qty: it.quantity,
              itemName: it.itemNameSnap,
              variantName: it.variantNameSnap,
            })),
          },
        }))}
      />
    </div>
  );
}
