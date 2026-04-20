import { z } from "zod";
import { phonePkSchema } from "./common.schema";

export const ingredientUnitEnum = z.enum(["G", "KG", "ML", "L", "PCS", "DOZEN"]);

const qtyPositiveSchema = z
  .number({ invalid_type_error: "Enter a quantity" })
  .min(0.001, "Minimum 0.001")
  .max(999_999.999, "Too large")
  .refine((n) => Number.isFinite(n) && Math.round(n * 1000) === n * 1000, {
    message: "Up to 3 decimal places",
  });

const qtyNonNegativeSchema = z
  .number()
  .min(0, "Cannot be negative")
  .max(999_999.999, "Too large")
  .refine((n) => Number.isFinite(n) && Math.round(n * 1000) === n * 1000, {
    message: "Up to 3 decimal places",
  });

const moneyPaisaPositiveSchema = z
  .number()
  .int("Whole paisa only")
  .min(0, "Must be 0 or more");

// ── Suppliers ───────────────────────────────────────────────────────
export const supplierCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Supplier name must be 2–60 characters")
    .max(60, "Supplier name must be 2–60 characters"),
  contactName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: phonePkSchema.optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  isActive: z.boolean(),
});
export const supplierUpdateSchema = supplierCreateSchema.extend({
  id: z.string().cuid(),
});

// ── Ingredients ─────────────────────────────────────────────────────
export const ingredientCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingredient name must be 2–60 characters")
    .max(60, "Ingredient name must be 2–60 characters"),
  unit: ingredientUnitEnum,
  reorderLevel: qtyNonNegativeSchema,
  // openingStock is optional: when > 0 we record a STOCK_TAKE movement at avgCost
  openingStock: qtyNonNegativeSchema.default(0),
  openingCostRupees: z
    .number()
    .min(0)
    .max(10_000_000)
    .refine((n) => Math.round(n * 100) === n * 100, { message: "Up to 2 decimals" }),
  supplierId: z.string().cuid().optional().or(z.literal("")),
  isActive: z.boolean(),
});
export const ingredientUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(60),
  unit: ingredientUnitEnum,
  reorderLevel: qtyNonNegativeSchema,
  supplierId: z.string().cuid().optional().or(z.literal("")),
  isActive: z.boolean(),
});
export const ingredientDeleteSchema = z.object({ id: z.string().cuid() });

// ── Recipes ─────────────────────────────────────────────────────────
export const recipeUpsertSchema = z.object({
  variantId: z.string().cuid(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        ingredientId: z.string().cuid(),
        quantity: qtyPositiveSchema,
        wastagePercent: z.number().int().min(0).max(50),
      }),
    )
    .max(40, "Up to 40 ingredients per recipe"),
});

// ── Stock movements ─────────────────────────────────────────────────
export const stockInSchema = z.object({
  branchId: z.string().cuid().optional().or(z.literal("")),
  supplierId: z.string().cuid().optional().or(z.literal("")),
  billNumber: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        ingredientId: z.string().cuid(),
        quantity: qtyPositiveSchema,
        unitCostRupees: z
          .number()
          .min(0)
          .max(10_000_000)
          .refine((n) => Math.round(n * 100) === n * 100, { message: "Up to 2 decimals" }),
      }),
    )
    .min(1, "Add at least one item")
    .max(50, "Up to 50 items per purchase"),
});

export const wastageLogSchema = z.object({
  branchId: z.string().cuid().optional().or(z.literal("")),
  ingredientId: z.string().cuid(),
  quantity: qtyPositiveSchema,
  reason: z.enum(["SPOILAGE", "BREAKAGE", "THEFT", "TRAINING", "OTHER"]),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const stockAdjustSchema = z.object({
  ingredientId: z.string().cuid(),
  newQuantity: qtyNonNegativeSchema,
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type IngredientCreateInput = z.infer<typeof ingredientCreateSchema>;
export type IngredientUpdateInput = z.infer<typeof ingredientUpdateSchema>;
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type RecipeUpsertInput = z.infer<typeof recipeUpsertSchema>;
export type StockInInput = z.infer<typeof stockInSchema>;
export type WastageLogInput = z.infer<typeof wastageLogSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
