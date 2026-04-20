import type { TableStatus } from "@prisma/client";

export type BranchPick = {
  id: string;
  name: string;
  isPrimary: boolean;
  taxBps: number;
  serviceBps: number;
};
export type CategoryPick = { id: string; name: string };
export type VariantPick = {
  id: string;
  name: string;
  priceCents: number;
  isDefault: boolean;
};
export type ModifierPick = {
  id: string;
  name: string;
  priceDeltaCents: number;
};
export type ModifierGroupPick = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierPick[];
};
export type ItemPick = {
  id: string;
  name: string;
  photoUrl: string | null;
  categoryId: string;
  variants: VariantPick[];
  modifierGroups: ModifierGroupPick[];
};
export type TablePick = {
  id: string;
  label: string;
  branchId: string;
  status: TableStatus;
  seats: number;
};
