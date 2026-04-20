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
  if (existingBranches === 0) {
    await prisma.branch.create({
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
