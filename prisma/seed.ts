/**
 * EasyMenu seed — Phase 1.
 *
 * - Upserts the four billing plans (trial / basic / pro / enterprise).
 * - Creates a super-admin user (admin@easymenu.dev / Admin@123).
 * - Creates a demo tenant ("Burger Hub") owned by demo@easymenu.dev / Demo@123,
 *   with a 14-day trial and a few menu categories.
 *
 * Re-running is idempotent.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLAN_SEED, TRIAL_DAYS } from "../src/lib/constants/plans";

const prisma = new PrismaClient();

async function main() {
  // ── Plans ──────────────────────────────────────────────────────────
  for (const p of PLAN_SEED) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: { ...p },
      create: { ...p },
    });
  }
  console.log(`✓ Plans upserted (${PLAN_SEED.length})`);

  // ── Super admin ────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@easymenu.dev" },
    update: { isSuperAdmin: true, passwordHash: adminPasswordHash },
    create: {
      email: "admin@easymenu.dev",
      name: "Platform Admin",
      passwordHash: adminPasswordHash,
      isSuperAdmin: true,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Super admin: ${admin.email} / Admin@123`);

  // ── Demo tenant + owner ────────────────────────────────────────────
  const demoPasswordHash = await bcrypt.hash("Demo@123", 12);
  const demoOwner = await prisma.user.upsert({
    where: { email: "demo@easymenu.dev" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "demo@easymenu.dev",
      name: "Demo Owner",
      passwordHash: demoPasswordHash,
      emailVerified: new Date(),
    },
  });

  const trialPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "trial" } });
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "burgerhub" },
    update: {},
    create: {
      slug: "burgerhub",
      name: "Burger Hub",
      cuisineType: "FAST_FOOD",
      contactPhone: "03001234567",
      hasDelivery: true,
      hasTakeaway: true,
      acceptCash: true,
      acceptCard: true,
      acceptJazzCash: true,
      acceptEasypaisa: true,
      onboardedAt: new Date(),
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: { tenantId: demoTenant.id, userId: demoOwner.id },
    },
    update: { role: "OWNER" },
    create: { tenantId: demoTenant.id, userId: demoOwner.id, role: "OWNER" },
  });

  await prisma.subscription.upsert({
    where: { tenantId: demoTenant.id },
    update: { trialEndsAt: trialEnd, currentPeriodEnd: trialEnd, status: "TRIALING" },
    create: {
      tenantId: demoTenant.id,
      planId: trialPlan.id,
      status: "TRIALING",
      trialEndsAt: trialEnd,
      currentPeriodEnd: trialEnd,
    },
  });

  // Menu categories + sample items + variants + modifiers
  const existingCats = await prisma.menuCategory.count({
    where: { tenantId: demoTenant.id },
  });
  if (existingCats === 0) {
    const burgers = await prisma.menuCategory.create({
      data: { tenantId: demoTenant.id, name: "Burgers", sortOrder: 0 },
    });
    const wraps = await prisma.menuCategory.create({
      data: { tenantId: demoTenant.id, name: "Wraps", sortOrder: 1 },
    });
    const sides = await prisma.menuCategory.create({
      data: { tenantId: demoTenant.id, name: "Sides", sortOrder: 2 },
    });
    const drinks = await prisma.menuCategory.create({
      data: { tenantId: demoTenant.id, name: "Drinks", sortOrder: 3 },
    });

    // Zinger Burger — 2 variants + Toppings group
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: burgers.id,
        name: "Zinger Burger",
        description: "Crispy chicken fillet, lettuce, mayo.",
        prepTimeMinutes: 8,
        sortOrder: 0,
        variants: {
          create: [
            { name: "Single", priceCents: 55000, isDefault: true, sortOrder: 0 },
            { name: "Double", priceCents: 78000, sortOrder: 1 },
          ],
        },
        modifierGroups: {
          create: [
            {
              name: "Add-ons",
              required: false,
              minSelect: 0,
              maxSelect: 3,
              sortOrder: 0,
              modifiers: {
                create: [
                  { name: "Extra cheese", priceDeltaCents: 5000, sortOrder: 0 },
                  { name: "Bacon strip", priceDeltaCents: 8000, sortOrder: 1 },
                  { name: "No onion", priceDeltaCents: 0, sortOrder: 2 },
                ],
              },
            },
          ],
        },
      },
    });

    // Beef Burger — single variant
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: burgers.id,
        name: "Classic Beef Burger",
        description: "Beef patty, cheddar, pickles.",
        prepTimeMinutes: 10,
        sortOrder: 1,
        variants: { create: [{ name: "Regular", priceCents: 65000, isDefault: true }] },
      },
    });

    // Shawarma Wrap
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: wraps.id,
        name: "Chicken Shawarma",
        prepTimeMinutes: 6,
        variants: {
          create: [
            { name: "Regular", priceCents: 35000, isDefault: true },
            { name: "Large", priceCents: 50000, sortOrder: 1 },
          ],
        },
        modifierGroups: {
          create: [
            {
              name: "Spice level",
              required: true,
              minSelect: 1,
              maxSelect: 1,
              modifiers: {
                create: [
                  { name: "Mild", sortOrder: 0 },
                  { name: "Medium", sortOrder: 1 },
                  { name: "Hot", sortOrder: 2 },
                ],
              },
            },
          ],
        },
      },
    });

    // Fries
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: sides.id,
        name: "French Fries",
        prepTimeMinutes: 4,
        variants: {
          create: [
            { name: "Regular", priceCents: 18000, isDefault: true },
            { name: "Large", priceCents: 25000, sortOrder: 1 },
          ],
        },
      },
    });

    // Drinks
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: drinks.id,
        name: "Coca-Cola",
        prepTimeMinutes: 1,
        variants: {
          create: [
            { name: "Can", priceCents: 8000, isDefault: true },
            { name: "1.5L Bottle", priceCents: 22000, sortOrder: 1 },
          ],
        },
      },
    });
  }

  // Default branch
  const existingBranches = await prisma.branch.count({
    where: { tenantId: demoTenant.id },
  });
  let primaryBranchId: string;
  if (existingBranches === 0) {
    const b = await prisma.branch.create({
      data: {
        tenantId: demoTenant.id,
        name: "Main branch",
        address: "Plot 7, Block C, Karachi",
        phone: "03001234567",
        isPrimary: true,
        isActive: true,
        taxBps: 1700, // 17% GST
        serviceBps: 0,
      },
    });
    primaryBranchId = b.id;
  } else {
    const b = await prisma.branch.findFirstOrThrow({
      where: { tenantId: demoTenant.id, isPrimary: true },
      select: { id: true },
    });
    primaryBranchId = b.id;
  }

  // Seed a few tables so QR ordering works out of the box.
  const existingTables = await prisma.restaurantTable.count({
    where: { tenantId: demoTenant.id },
  });
  if (existingTables === 0) {
    for (let i = 1; i <= 4; i++) {
      await prisma.restaurantTable.create({
        data: {
          tenantId: demoTenant.id,
          branchId: primaryBranchId,
          label: `T-${i}`,
          seats: i % 2 === 0 ? 4 : 2,
        },
      });
    }
  }

  // Inventory: supplier + ingredients + recipes
  const existingIngs = await prisma.ingredient.count({ where: { tenantId: demoTenant.id } });
  if (existingIngs === 0) {
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: demoTenant.id,
        name: "Karachi Wholesale",
        contactName: "Mr. Imran",
        phone: "03001112222",
        isActive: true,
      },
    });

    // Ingredient name → unit + opening stock + cost per unit (paisa)
    const ingredientSeed: Array<{
      name: string;
      unit: "G" | "KG" | "ML" | "L" | "PCS";
      stock: number;
      reorder: number;
      costCents: number; // per unit
    }> = [
      { name: "Chicken fillet", unit: "KG", stock: 8, reorder: 2, costCents: 65_000 }, // PKR 650/kg
      { name: "Beef patty (cooked)", unit: "PCS", stock: 40, reorder: 10, costCents: 18_000 }, // PKR 180 each
      { name: "Burger bun", unit: "PCS", stock: 60, reorder: 20, costCents: 4_000 }, // PKR 40 each
      { name: "Cheddar slice", unit: "PCS", stock: 80, reorder: 25, costCents: 2_500 }, // PKR 25 each
      { name: "Lettuce", unit: "G", stock: 1500, reorder: 500, costCents: 30 }, // PKR 0.30/g (PKR 300/kg)
      { name: "Mayo", unit: "ML", stock: 2000, reorder: 500, costCents: 25 }, // PKR 0.25/ml
      { name: "Tortilla", unit: "PCS", stock: 50, reorder: 15, costCents: 5_000 }, // PKR 50 each
      { name: "Potato (fries-cut)", unit: "KG", stock: 12, reorder: 3, costCents: 12_000 }, // PKR 120/kg
      { name: "Cooking oil", unit: "L", stock: 10, reorder: 3, costCents: 60_000 }, // PKR 600/L
      { name: "Coca-Cola can", unit: "PCS", stock: 100, reorder: 30, costCents: 6_000 }, // PKR 60 cost
      { name: "Coca-Cola 1.5L", unit: "PCS", stock: 30, reorder: 10, costCents: 18_000 }, // PKR 180 cost
    ];

    const ingredients = new Map<string, { id: string; unit: string }>();
    for (const seed of ingredientSeed) {
      const ing = await prisma.ingredient.create({
        data: {
          tenantId: demoTenant.id,
          name: seed.name,
          unit: seed.unit,
          currentStock: seed.stock,
          reorderLevel: seed.reorder,
          avgCostCents: seed.costCents,
          supplierId: supplier.id,
          isActive: true,
        },
      });
      ingredients.set(seed.name, { id: ing.id, unit: seed.unit });
    }

    // Helper: build recipe items array
    function recipeFor(specs: Array<{ name: string; qty: number; waste?: number }>) {
      return specs.map((s) => {
        const ing = ingredients.get(s.name);
        if (!ing) throw new Error(`Missing seed ingredient: ${s.name}`);
        return {
          ingredientId: ing.id,
          quantity: s.qty,
          wastagePercent: s.waste ?? 0,
        };
      });
    }

    // Map menu variants to recipes
    const variantRecipes: Array<{
      itemName: string;
      variantName: string;
      items: ReturnType<typeof recipeFor>;
    }> = [
      {
        itemName: "Zinger Burger",
        variantName: "Single",
        items: recipeFor([
          { name: "Chicken fillet", qty: 0.15, waste: 5 },
          { name: "Burger bun", qty: 1 },
          { name: "Lettuce", qty: 20 },
          { name: "Mayo", qty: 30 },
          { name: "Cooking oil", qty: 0.05 },
        ]),
      },
      {
        itemName: "Zinger Burger",
        variantName: "Double",
        items: recipeFor([
          { name: "Chicken fillet", qty: 0.28, waste: 5 },
          { name: "Burger bun", qty: 1 },
          { name: "Cheddar slice", qty: 1 },
          { name: "Lettuce", qty: 25 },
          { name: "Mayo", qty: 35 },
          { name: "Cooking oil", qty: 0.07 },
        ]),
      },
      {
        itemName: "Classic Beef Burger",
        variantName: "Regular",
        items: recipeFor([
          { name: "Beef patty (cooked)", qty: 1 },
          { name: "Burger bun", qty: 1 },
          { name: "Cheddar slice", qty: 1 },
          { name: "Lettuce", qty: 15 },
          { name: "Mayo", qty: 25 },
        ]),
      },
      {
        itemName: "Chicken Shawarma",
        variantName: "Regular",
        items: recipeFor([
          { name: "Chicken fillet", qty: 0.1 },
          { name: "Tortilla", qty: 1 },
          { name: "Lettuce", qty: 15 },
          { name: "Mayo", qty: 20 },
        ]),
      },
      {
        itemName: "French Fries",
        variantName: "Regular",
        items: recipeFor([
          { name: "Potato (fries-cut)", qty: 0.18, waste: 8 },
          { name: "Cooking oil", qty: 0.04 },
        ]),
      },
      {
        itemName: "Coca-Cola",
        variantName: "Can",
        items: recipeFor([{ name: "Coca-Cola can", qty: 1 }]),
      },
      {
        itemName: "Coca-Cola",
        variantName: "1.5L Bottle",
        items: recipeFor([{ name: "Coca-Cola 1.5L", qty: 1 }]),
      },
    ];

    for (const r of variantRecipes) {
      const variant = await prisma.menuVariant.findFirst({
        where: {
          name: r.variantName,
          item: { name: r.itemName, tenantId: demoTenant.id, deletedAt: null },
        },
        select: { id: true },
      });
      if (!variant) continue;
      const recipe = await prisma.recipe.create({
        data: {
          variantId: variant.id,
          items: { create: r.items },
        },
      });
      // Compute and cache cost
      const items = await prisma.recipeItem.findMany({
        where: { recipeId: recipe.id },
        include: { ingredient: { select: { avgCostCents: true } } },
      });
      const cost = items.reduce(
        (s, i) =>
          s + Number(i.quantity) * i.ingredient.avgCostCents * (1 + i.wastagePercent / 100),
        0,
      );
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { cachedCostCents: Math.round(cost) },
      });
    }
  }

  console.log(`✓ Demo tenant: /${demoTenant.slug}`);
  console.log(`  Owner login: demo@easymenu.dev / Demo@123`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
