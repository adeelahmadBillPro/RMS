import { notFound } from "next/navigation";
import { Table2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { TableManager } from "@/components/tables/table-manager";

export const dynamic = "force-dynamic";

export default async function TablesPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [tables, branches] = await Promise.all([
    prisma.restaurantTable.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { label: "asc" },
      include: { _count: { select: { orders: { where: { status: { not: "CANCELLED" }, completedAt: null } } } } },
    }),
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isPrimary: true },
    }),
  ]);

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const canDelete = ctx.membership.role === "OWNER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">TABLES</p>
        <h1 className="mt-1 text-h1">Tables</h1>
      </header>

      {branches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Table2 className="h-5 w-5" />}
            title="Add a branch first"
            description="Tables belong to a branch. Visit Settings → Branches."
          />
        </Card>
      ) : (
        <TableManager
          slug={params.tenantSlug}
          canManage={canManage}
          canDelete={canDelete}
          branches={branches}
          tables={tables.map((t) => ({
            id: t.id,
            label: t.label,
            seats: t.seats,
            status: t.status,
            branchId: t.branchId,
            qrCode: t.qrCode,
            activeOrders: t._count.orders,
          }))}
        />
      )}
    </div>
  );
}
