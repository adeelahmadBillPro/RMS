import { notFound } from "next/navigation";
import { ChefHat } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { RecipesWorkspace } from "@/components/recipes/recipes-workspace";

export const dynamic = "force-dynamic";

export default async function RecipesPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [items, ingredients] = await Promise.all([
    prisma.menuItem.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            recipe: {
              select: {
                id: true,
                cachedCostCents: true,
                notes: true,
                items: {
                  select: {
                    ingredientId: true,
                    quantity: true,
                    wastagePercent: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">RECIPES</p>
        <h1 className="mt-1 text-h1">Recipes & cost-per-plate</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Link each menu variant to ingredients to see what it costs to make.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChefHat className="h-5 w-5" />}
            title="No menu items yet"
            description="Add menu items first, then link them to ingredients here."
          />
        </Card>
      ) : ingredients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChefHat className="h-5 w-5" />}
            title="Add ingredients first"
            description="Recipes link items to ingredients. Visit Inventory to add ingredients."
          />
        </Card>
      ) : (
        <RecipesWorkspace
          slug={params.tenantSlug}
          canManage={canManage}
          items={items.map((it) => ({
            id: it.id,
            name: it.name,
            categoryName: it.category.name,
            variants: it.variants.map((v) => ({
              id: v.id,
              name: v.name,
              priceCents: v.priceCents,
              isDefault: v.isDefault,
              recipeId: v.recipe?.id ?? null,
              cachedCostCents: v.recipe?.cachedCostCents ?? 0,
              notes: v.recipe?.notes ?? "",
              items:
                v.recipe?.items.map((ri) => ({
                  ingredientId: ri.ingredientId,
                  quantity: Number(ri.quantity),
                  wastagePercent: ri.wastagePercent,
                })) ?? [],
            })),
          }))}
          ingredients={ingredients.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            avgCostCents: i.avgCostCents,
          }))}
        />
      )}
    </div>
  );
}
