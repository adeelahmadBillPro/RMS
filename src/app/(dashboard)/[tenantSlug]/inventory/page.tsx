import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { InventoryWorkspace } from "@/components/inventory/inventory-workspace";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
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

  const [ingredients, suppliers, branches, recentMovements] = await Promise.all([
    prisma.ingredient.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { supplier: { select: { id: true, name: true } } },
    }),
    prisma.supplier.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isPrimary: true },
    }),
    prisma.stockMovement.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { ingredient: { select: { name: true, unit: true } } },
    }),
  ]);

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const canDelete = ctx.membership.role === "OWNER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">INVENTORY</p>
        <h1 className="mt-1 text-h1">Inventory</h1>
      </header>
      <InventoryWorkspace
        slug={params.tenantSlug}
        canManage={canManage}
        canDelete={canDelete}
        initialTab={
          searchParams.tab === "movements" || searchParams.tab === "suppliers"
            ? searchParams.tab
            : "ingredients"
        }
        ingredients={ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          currentStock: Number(i.currentStock),
          reorderLevel: Number(i.reorderLevel),
          avgCostCents: i.avgCostCents,
          isActive: i.isActive,
          supplierId: i.supplierId,
          supplierName: i.supplier?.name ?? null,
        }))}
        suppliers={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          contactName: s.contactName,
          phone: s.phone,
          notes: s.notes,
          isActive: s.isActive,
        }))}
        branches={branches}
        movements={recentMovements.map((m) => ({
          id: m.id,
          createdAt: m.createdAt.toISOString(),
          reason: m.reason,
          deltaQty: Number(m.deltaQty),
          unitCostCents: m.unitCostCents,
          notes: m.notes,
          wastageReason: m.wastageReason,
          ingredientName: m.ingredient.name,
          ingredientUnit: m.ingredient.unit,
        }))}
      />
    </div>
  );
}
