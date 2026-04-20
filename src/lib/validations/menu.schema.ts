import { z } from "zod";
import { moneyRupeesSchema } from "./common.schema";

// ── Categories ──────────────────────────────────────────────────────
export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be 2–40 characters")
    .max(40, "Category name must be 2–40 characters"),
  nameUr: z.string().trim().max(40).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
  scheduledStartMin: z.number().int().min(0).max(1439).nullable().optional(),
  scheduledEndMin: z.number().int().min(0).max(1439).nullable().optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.extend({
  id: z.string().cuid(),
});
export const categoryDeleteSchema = z.object({ id: z.string().cuid() });
export const categoryReorderSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(200),
});

// ── Items ───────────────────────────────────────────────────────────
const variantInputSchema = z.object({
  id: z.string().cuid().optional(), // undefined = new
  name: z
    .string()
    .trim()
    .min(1, "Variant name is required")
    .max(40, "Variant name must be 40 characters or fewer"),
  priceRupees: moneyRupeesSchema, // converted to paisa server-side
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
});

const modifierInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Modifier name is required")
    .max(40, "Modifier name must be 40 characters or fewer"),
  priceDeltaRupees: z
    .number()
    .min(-10_000_000, "Out of range")
    .max(10_000_000, "Out of range")
    .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
      message: "Up to 2 decimals only",
    }),
  isAvailable: z.boolean(),
});

const modifierGroupInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(40, "Group name must be 40 characters or fewer"),
  required: z.boolean(),
  minSelect: z.number().int().min(0).max(20),
  maxSelect: z.number().int().min(1).max(20),
  modifiers: z.array(modifierInputSchema).max(40, "Up to 40 modifiers per group"),
});

export const itemCreateSchema = z
  .object({
    categoryId: z.string().cuid("Pick a category"),
    name: z
      .string()
      .trim()
      .min(2, "Item name must be 2–80 characters")
      .max(80, "Item name must be 2–80 characters"),
    nameUr: z.string().trim().max(80).optional().or(z.literal("")),
    description: z.string().trim().max(500, "Description max 500 characters").optional().or(z.literal("")),
    photoUrl: z.string().url("Photo URL must be a valid URL").optional().or(z.literal("")),
    prepTimeMinutes: z
      .number()
      .int()
      .min(1, "Prep time must be 1–180 minutes")
      .max(180, "Prep time must be 1–180 minutes"),
    isAvailable: z.boolean(),
    variants: z
      .array(variantInputSchema)
      .min(1, "Add at least one variant (e.g. Regular)")
      .max(10, "Up to 10 variants"),
    modifierGroups: z.array(modifierGroupInputSchema).max(8, "Up to 8 modifier groups"),
  })
  .refine((d) => d.variants.filter((v) => v.isDefault).length === 1, {
    path: ["variants"],
    message: "Mark exactly one variant as default",
  })
  .refine(
    (d) =>
      d.modifierGroups.every((g) => g.minSelect <= g.maxSelect && g.minSelect <= g.modifiers.length),
    {
      path: ["modifierGroups"],
      message: "Each group needs minSelect ≤ maxSelect ≤ available modifiers",
    },
  );

export const itemUpdateSchema = z.intersection(
  itemCreateSchema,
  z.object({ id: z.string().cuid() }),
);

export const itemDeleteSchema = z.object({ id: z.string().cuid() });
export const itemToggleSchema = z.object({
  id: z.string().cuid(),
  isAvailable: z.boolean(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
