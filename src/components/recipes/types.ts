import type { IngredientUnit } from "@prisma/client";

export type RecipeIngredientPick = {
  id: string;
  name: string;
  unit: IngredientUnit;
  avgCostCents: number;
};

export type RecipeItemRow = {
  ingredientId: string;
  quantity: number;
  wastagePercent: number;
};

export type RecipeVariantRow = {
  id: string;
  name: string;
  priceCents: number;
  isDefault: boolean;
  recipeId: string | null;
  cachedCostCents: number;
  notes: string;
  items: RecipeItemRow[];
};

export type RecipeItemMenuRow = {
  id: string;
  name: string;
  categoryName: string;
  variants: RecipeVariantRow[];
};
