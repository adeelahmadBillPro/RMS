import { describe, it, expect } from "vitest";
import {
  ingredientCreateSchema,
  recipeUpsertSchema,
  stockInSchema,
  wastageLogSchema,
} from "@/lib/validations/inventory.schema";

const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";

describe("validations / ingredient", () => {
  it("accepts a clean payload", () => {
    expect(
      ingredientCreateSchema.safeParse({
        name: "Chicken",
        unit: "KG",
        reorderLevel: 2,
        openingStock: 5,
        openingCostRupees: 600,
        supplierId: "",
        isActive: true,
      }).success,
    ).toBe(true);
  });
  it("rejects 4-decimal quantity", () => {
    expect(
      ingredientCreateSchema.safeParse({
        name: "Salt",
        unit: "G",
        reorderLevel: 0.0001,
        openingStock: 0,
        openingCostRupees: 0,
        supplierId: "",
        isActive: true,
      }).success,
    ).toBe(false);
  });
});

describe("validations / recipe", () => {
  it("accepts a recipe with one ingredient", () => {
    expect(
      recipeUpsertSchema.safeParse({
        variantId: cuid,
        notes: "",
        items: [{ ingredientId: cuid, quantity: 0.15, wastagePercent: 5 }],
      }).success,
    ).toBe(true);
  });
  it("rejects negative wastage", () => {
    expect(
      recipeUpsertSchema.safeParse({
        variantId: cuid,
        items: [{ ingredientId: cuid, quantity: 0.1, wastagePercent: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe("validations / stock-in", () => {
  it("requires at least one item", () => {
    expect(
      stockInSchema.safeParse({ branchId: "", supplierId: "", billNumber: "", notes: "", items: [] }).success,
    ).toBe(false);
  });
  it("accepts a valid purchase line", () => {
    expect(
      stockInSchema.safeParse({
        items: [{ ingredientId: cuid, quantity: 5, unitCostRupees: 600 }],
      }).success,
    ).toBe(true);
  });
});

describe("validations / wastage", () => {
  it("requires a known reason enum", () => {
    expect(
      wastageLogSchema.safeParse({
        ingredientId: cuid,
        quantity: 0.5,
        reason: "MAGIC",
      }).success,
    ).toBe(false);
  });
  it("accepts a valid wastage entry", () => {
    expect(
      wastageLogSchema.safeParse({
        ingredientId: cuid,
        quantity: 0.5,
        reason: "SPOILAGE",
      }).success,
    ).toBe(true);
  });
});
