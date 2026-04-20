import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { DeliveryWorkspace } from "@/components/delivery/delivery-workspace";

export const dynamic = "force-dynamic";

export default async function DeliveriesPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string };
  searchParams: { tab?: string };
}) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  // Delivery riders go to their own view.
  if (ctx.membership.role === "DELIVERY") {
    redirect(`/${params.tenantSlug}/deliveries/mine`);
  }

  const [orders, riders, pendingSubs, recentSubs] = await Promise.all([
    // Active delivery orders (not completed, or completed in last 24h)
    prisma.order.findMany({
      where: {
        tenantId: ctx.tenantId,
        channel: "DELIVERY",
        OR: [
          { status: { notIn: ["COMPLETED", "CANCELLED"] } },
          {
            status: "COMPLETED",
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        deliveryAssignment: {
          include: { deliveryUser: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId: ctx.tenantId, role: "DELIVERY", deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.deliveryCashSubmission.findMany({
      where: { tenantId: ctx.tenantId, status: "PENDING" },
      include: {
        deliveryUser: { select: { id: true, name: true } },
        assignments: {
          include: { order: { select: { orderNumber: true, customerName: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.deliveryCashSubmission.findMany({
      where: { tenantId: ctx.tenantId, status: { in: ["RECONCILED", "DISPUTED"] } },
      include: { deliveryUser: { select: { name: true } } },
      orderBy: { reconciledAt: "desc" },
      take: 20,
    }),
  ]);

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">DELIVERIES</p>
        <h1 className="mt-1 text-h1">Deliveries</h1>
      </header>

      <DeliveryWorkspace
        slug={params.tenantSlug}
        canManage={canManage}
        initialTab={searchParams.tab === "cash" ? "cash" : "active"}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          deliveryAddress: o.deliveryAddress,
          totalCents: o.totalCents,
          createdAt: o.createdAt.toISOString(),
          assignment: o.deliveryAssignment
            ? {
                id: o.deliveryAssignment.id,
                status: o.deliveryAssignment.status,
                riderId: o.deliveryAssignment.deliveryUserId,
                riderName: o.deliveryAssignment.deliveryUser.name,
                collectedCashCents: o.deliveryAssignment.collectedCashCents,
                assignedAt: o.deliveryAssignment.assignedAt.toISOString(),
                pickedUpAt: o.deliveryAssignment.pickedUpAt?.toISOString() ?? null,
                deliveredAt: o.deliveryAssignment.deliveredAt?.toISOString() ?? null,
                returnedAt: o.deliveryAssignment.returnedAt?.toISOString() ?? null,
                returnReason: o.deliveryAssignment.returnReason,
                cashSubmissionId: o.deliveryAssignment.cashSubmissionId,
              }
            : null,
        }))}
        riders={riders.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
        }))}
        pendingSubs={pendingSubs.map((s) => ({
          id: s.id,
          riderName: s.deliveryUser.name,
          totalCents: s.totalCents,
          count: s.assignments.length,
          submittedAt: s.submittedAt.toISOString(),
          notes: s.notes,
          orders: s.assignments.map((a) => ({
            orderNumber: a.order.orderNumber,
            customerName: a.order.customerName,
            collectedCashCents: a.collectedCashCents,
          })),
        }))}
        recentSubs={recentSubs.map((s) => ({
          id: s.id,
          riderName: s.deliveryUser.name,
          totalCents: s.totalCents,
          status: s.status,
          reconciledAt: s.reconciledAt?.toISOString() ?? null,
          reconcileNotes: s.reconcileNotes,
        }))}
      />
    </div>
  );
}
