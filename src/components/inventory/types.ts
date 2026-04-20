import type { IngredientUnit, StockMovementReason, WastageReason } from "@prisma/client";

export type IngredientRow = {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentStock: number;
  reorderLevel: number;
  avgCostCents: number;
  isActive: boolean;
  supplierId: string | null;
  supplierName: string | null;
};

export type SupplierRow = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
};

export type BranchPick = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type StockMovementRow = {
  id: string;
  createdAt: string;
  reason: StockMovementReason;
  deltaQty: number;
  unitCostCents: number;
  notes: string | null;
  wastageReason: WastageReason | null;
  ingredientName: string;
  ingredientUnit: IngredientUnit;
};
