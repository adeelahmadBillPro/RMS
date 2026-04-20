import type { Prisma } from "@prisma/client";
import { applyStockMovement } from "@/lib/inventory/stock";

/**
 * On order completion (or sale), deduct ingredient stock based on each
 * variant's recipe. Items without a recipe are silently skipped — this
 * keeps the POS usable while recipes are still being built out.
 *
 * Quantities are: orderItem.quantity * recipeItem.quantity.
 * Wastage padding from RecipeItem.wastagePercent is also deducted.
 */
export async function deductStockForOrder(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    branchId: string | null;
    orderId: string;
  },
) {
  const items = await tx.orderItem.findMany({
    where: { orderId: args.orderId },
    include: {
      modifiers: { select: { modifierNameSnap: true } },
    },
  });

  for (const oi of items) {
    const recipe = await tx.recipe.findUnique({
      where: { variantId: oi.variantId },
      include: {
        items: { include: { ingredient: { select: { id: true, avgCostCents: true, currentStock: true } } } },
      },
    });
    if (!recipe) continue;
    for (const ri of recipe.items) {
      const wastageMult = 1 + ri.wastagePercent / 100;
      const deltaQty = -Number(ri.quantity) * oi.quantity * wastageMult;
      // applyStockMovement will throw INSUFFICIENT_STOCK if applicable.
      await applyStockMovement(tx, {
        tenantId: args.tenantId,
        branchId: args.branchId,
        ingredientId: ri.ingredient.id,
        reason: "SALE",
        deltaQty,
        unitCostCents: ri.ingredient.avgCostCents,
        refType: "ORDER_ITEM",
        refId: oi.id,
        notes: `Order item ${oi.id}`,
      });
    }
  }
}
