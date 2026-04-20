import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { POSScreen } from "@/components/pos/pos-screen";

export const dynamic = "force-dynamic";

export default async function POSPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [tenant, branches, categories, items, tables] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { hasDelivery: true, hasTakeaway: true, name: true },
    }),
    prisma.branch.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isPrimary: true, taxBps: true, serviceBps: true },
    }),
    prisma.menuCategory.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isAvailable: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        variants: {
          where: { deletedAt: null, isAvailable: true },
          orderBy: { sortOrder: "asc" },
        },
        modifierGroups: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            modifiers: {
              where: { deletedAt: null, isAvailable: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
    prisma.restaurantTable.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { label: "asc" },
      select: { id: true, label: true, branchId: true, status: true, seats: true },
    }),
  ]);

  if (!tenant) notFound();

  if (categories.length === 0 || items.length === 0) {
    return (
      <div className="container py-8">
        <Link href={`/${params.tenantSlug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <Card>
          <EmptyState
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="No menu yet"
            description="Add menu categories and items before opening the POS."
          />
        </Card>
      </div>
    );
  }

  return (
    <POSScreen
      slug={params.tenantSlug}
      tenantName={tenant.name}
      hasDelivery={tenant.hasDelivery}
      hasTakeaway={tenant.hasTakeaway}
      branches={branches}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      items={items.map((it) => ({
        id: it.id,
        name: it.name,
        photoUrl: it.photoUrl,
        categoryId: it.categoryId,
        variants: it.variants.map((v) => ({
          id: v.id,
          name: v.name,
          priceCents: v.priceCents,
          isDefault: v.isDefault,
        })),
        modifierGroups: it.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            priceDeltaCents: m.priceDeltaCents,
          })),
        })),
      }))}
      tables={tables.map((t) => ({
        id: t.id,
        label: t.label,
        branchId: t.branchId,
        status: t.status,
        seats: t.seats,
      }))}
    />
  );
}
