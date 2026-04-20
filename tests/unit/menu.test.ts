import { describe, it, expect } from "vitest";
import { categoryCreateSchema, itemCreateSchema } from "@/lib/validations/menu.schema";

describe("validations / menu category", () => {
  it("requires non-trivial name", () => {
    expect(
      categoryCreateSchema.safeParse({ name: "X", sortOrder: 0, isActive: true }).success,
    ).toBe(false);
    expect(
      categoryCreateSchema.safeParse({ name: "Burgers", sortOrder: 0, isActive: true }).success,
    ).toBe(true);
  });
});

describe("validations / menu item", () => {
  const cuid = "ckxxxxxxxxxxxxxxxxxxxxxxx";
  const baseValid = {
    categoryId: cuid,
    name: "Zinger Burger",
    nameUr: "",
    description: "",
    photoUrl: "",
    prepTimeMinutes: 8,
    isAvailable: true,
    variants: [{ name: "Single", priceRupees: 550, isDefault: true, isAvailable: true }],
    modifierGroups: [],
  };

  it("accepts a clean payload with one default variant", () => {
    expect(itemCreateSchema.safeParse(baseValid).success).toBe(true);
  });

  it("rejects two defaults", () => {
    expect(
      itemCreateSchema.safeParse({
        ...baseValid,
        variants: [
          { name: "S", priceRupees: 100, isDefault: true, isAvailable: true },
          { name: "L", priceRupees: 200, isDefault: true, isAvailable: true },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects zero variants", () => {
    expect(itemCreateSchema.safeParse({ ...baseValid, variants: [] }).success).toBe(false);
  });

  it("rejects modifier group with min > max", () => {
    expect(
      itemCreateSchema.safeParse({
        ...baseValid,
        modifierGroups: [
          {
            name: "Toppings",
            required: false,
            minSelect: 3,
            maxSelect: 1,
            modifiers: [{ name: "Cheese", priceDeltaRupees: 50, isAvailable: true }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects min > available modifiers", () => {
    expect(
      itemCreateSchema.safeParse({
        ...baseValid,
        modifierGroups: [
          {
            name: "Spice",
            required: true,
            minSelect: 5,
            maxSelect: 5,
            modifiers: [{ name: "Mild", priceDeltaRupees: 0, isAvailable: true }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
