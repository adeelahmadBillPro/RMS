import type { IngredientUnit } from "@prisma/client";

export const UNIT_LABEL: Record<IngredientUnit, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  PCS: "pcs",
  DOZEN: "dozen",
};

export const UNIT_LONG: Record<IngredientUnit, string> = {
  G: "Grams",
  KG: "Kilograms",
  ML: "Millilitres",
  L: "Litres",
  PCS: "Pieces",
  DOZEN: "Dozens",
};

export const UNIT_OPTIONS: { value: IngredientUnit; label: string }[] = [
  { value: "G", label: "Grams (g)" },
  { value: "KG", label: "Kilograms (kg)" },
  { value: "ML", label: "Millilitres (ml)" },
  { value: "L", label: "Litres (L)" },
  { value: "PCS", label: "Pieces" },
  { value: "DOZEN", label: "Dozens" },
];

/** Format a Decimal-ish number stored at 3 dp for display: 1.500 → "1.5" */
export function formatQty(n: number | string, unit: IngredientUnit): string {
  const value = typeof n === "string" ? parseFloat(n) : n;
  // Trim trailing zeros from up to 3 dp
  const trimmed = value.toFixed(3).replace(/\.?0+$/, "");
  return `${trimmed} ${UNIT_LABEL[unit]}`;
}
