import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { MenuWorkspace } from "@/components/menu/menu-workspace";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string };
  searchParams: { tab?: string; cat?: string };
}) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        modifierGroups: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            modifiers: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
          },
        },
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">MENU</p>
        <h1 className="mt-1 text-h1">Menu</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {categories.length} categories · {items.length} items
        </p>
      </header>
      <MenuWorkspace
        slug={params.tenantSlug}
        canManage={canManage}
        initialTab={searchParams.tab === "items" ? "items" : "categories"}
        initialCategoryFilter={searchParams.cat ?? null}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameUr: c.nameUr,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          scheduledStartMin: c.scheduledStartMin,
          scheduledEndMin: c.scheduledEndMin,
        }))}
        items={items.map((it) => ({
          id: it.id,
          name: it.name,
          nameUr: it.nameUr,
          description: it.description,
          photoUrl: it.photoUrl,
          prepTimeMinutes: it.prepTimeMinutes,
          isAvailable: it.isAvailable,
          categoryId: it.categoryId,
          categoryName: it.category.name,
          variants: it.variants.map((v) => ({
            id: v.id,
            name: v.name,
            priceCents: v.priceCents,
            isDefault: v.isDefault,
            isAvailable: v.isAvailable,
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
              isAvailable: m.isAvailable,
            })),
          })),
        }))}
      />
    </div>
  );
}
