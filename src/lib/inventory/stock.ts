import { Prisma } from "@prisma/client";
import type { StockMovementReason, WastageReason } from "@prisma/client";
import { refreshRecipesUsingIngredient } from "./cost";

/**
 * Apply a single stock movement: write the StockMovement row AND update
 * the Ingredient's currentStock atomically. Returns the movement.
 *
 * For PURCHASE movements, also update avgCostCents using a weighted
 * average and refresh any recipes that use this ingredient.
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    branchId?: string | null;
    ingredientId: string;
    reason: StockMovementReason;
    deltaQty: number; // positive in / negative out
    unitCostCents: number; // per-unit cost at time of movement
    notes?: string | null;
    refType?: string | null;
    refId?: string | null;
    wastageReason?: WastageReason | null;
    createdById?: string | null;
  },
) {
  // Row-lock the ingredient FOR UPDATE so concurrent purchases don't race
  // on the weighted-average cost calc (T1 reads avgCost A, T2 reads avgCost
  // A, both write divergent results based on stale state). The lock is
  // released when the transaction commits.
  await tx.$queryRaw`SELECT id FROM "Ingredient" WHERE id = ${args.ingredientId} FOR UPDATE`;
  const ing = await tx.ingredient.findUniqueOrThrow({
    where: { id: args.ingredientId },
    select: { id: true, currentStock: true, avgCostCents: true, tenantId: true },
  });
  if (ing.tenantId !== args.tenantId) {
    throw new Error("CROSS_TENANT_INGREDIENT");
  }

  const currentStock = Number(ing.currentStock);
  const nextStock = currentStock + args.deltaQty;
  if (nextStock < 0) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  // Weighted average for incoming purchases
  let nextAvgCost = ing.avgCostCents;
  if (args.reason === "PURCHASE" && args.deltaQty > 0) {
    const totalCostBefore = currentStock * ing.avgCostCents;
    const totalCostIn = args.deltaQty * args.unitCostCents;
    const totalQty = currentStock + args.deltaQty;
    nextAvgCost = totalQty > 0 ? Math.round((totalCostBefore + totalCostIn) / totalQty) : args.unitCostCents;
  }

  await tx.ingredient.update({
    where: { id: ing.id },
    data: {
      currentStock: new Prisma.Decimal(nextStock.toFixed(3)),
      ...(args.reason === "PURCHASE" && args.deltaQty > 0 ? { avgCostCents: nextAvgCost } : {}),
    },
  });

  const movement = await tx.stockMovement.create({
    data: {
      tenantId: args.tenantId,
      branchId: args.branchId ?? null,
      ingredientId: ing.id,
      reason: args.reason,
      deltaQty: new Prisma.Decimal(args.deltaQty.toFixed(3)),
      unitCostCents: args.unitCostCents,
      notes: args.notes ?? null,
      refType: args.refType ?? null,
      refId: args.refId ?? null,
      wastageReason: args.wastageReason ?? null,
      createdById: args.createdById ?? null,
    },
  });

  if (args.reason === "PURCHASE" && args.deltaQty > 0) {
    await refreshRecipesUsingIngredient(tx, ing.id);
  }

  return movement;
}
