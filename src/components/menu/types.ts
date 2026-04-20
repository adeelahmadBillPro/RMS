export type CategoryRow = {
  id: string;
  name: string;
  nameUr: string | null;
  sortOrder: number;
  isActive: boolean;
  scheduledStartMin: number | null;
  scheduledEndMin: number | null;
};

export type VariantRow = {
  id: string;
  name: string;
  priceCents: number;
  isDefault: boolean;
  isAvailable: boolean;
};

export type ModifierRow = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isAvailable: boolean;
};

export type ModifierGroupRow = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierRow[];
};

export type ItemRow = {
  id: string;
  name: string;
  nameUr: string | null;
  description: string | null;
  photoUrl: string | null;
  prepTimeMinutes: number;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
  variants: VariantRow[];
  modifierGroups: ModifierGroupRow[];
};
