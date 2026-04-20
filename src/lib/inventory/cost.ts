import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * Compute the cost-per-plate for a single recipe, in paisa (Int).
 *
 * cost = sum over recipe items of:
 *   quantity * ingredient.avgCostCents * (1 + wastagePercent/100)
 *
 * Returns 0 for empty recipes. Always rounds to nearest paisa.
 */
export async function computeRecipeCostCents(
  tx: Prisma.TransactionClient | typeof prisma,
  recipeId: string,
): Promise<number> {
  const items = await tx.recipeItem.findMany({
    where: { recipeId },
    include: { ingredient: { select: { avgCostCents: true } } },
  });
  let total = 0;
  for (const it of items) {
    const qty = Number(it.quantity); // Prisma Decimal → number; safe for our magnitude
    const wastageMult = 1 + it.wastagePercent / 100;
    total += qty * it.ingredient.avgCostCents * wastageMult;
  }
  return Math.round(total);
}

/** Recompute and persist cachedCostCents on a recipe. */
export async function refreshRecipeCost(
  tx: Prisma.TransactionClient | typeof prisma,
  recipeId: string,
) {
  const cents = await computeRecipeCostCents(tx, recipeId);
  await tx.recipe.update({ where: { id: recipeId }, data: { cachedCostCents: cents } });
  return cents;
}

/**
 * Recompute every recipe that uses an ingredient.
 * Call after a PURCHASE updates the ingredient's avgCostCents.
 */
export async function refreshRecipesUsingIngredient(
  tx: Prisma.TransactionClient | typeof prisma,
  ingredientId: string,
) {
  const recipeIds = await tx.recipeItem.findMany({
    where: { ingredientId },
    select: { recipeId: true },
    distinct: ["recipeId"],
  });
  for (const r of recipeIds) {
    await refreshRecipeCost(tx, r.recipeId);
  }
}
