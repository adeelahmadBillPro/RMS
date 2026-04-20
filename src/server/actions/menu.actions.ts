"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { rupeesToPaisa } from "@/lib/utils";
import {
  categoryCreateSchema,
  categoryDeleteSchema,
  categoryReorderSchema,
  categoryUpdateSchema,
  itemCreateSchema,
  itemDeleteSchema,
  itemToggleSchema,
  itemUpdateSchema,
} from "@/lib/validations/menu.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function requireManager(role: string): boolean {
  return role === "OWNER" || role === "MANAGER";
}

// ── Categories ──────────────────────────────────────────────────────

export async function createCategoryAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) {
    return { ok: false, error: "Only owners and managers can edit the menu." };
  }
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  try {
    const cat = await prisma.menuCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.data.name,
        nameUr: parsed.data.nameUr || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        scheduledStartMin: parsed.data.scheduledStartMin ?? null,
        scheduledEndMin: parsed.data.scheduledEndMin ?? null,
      },
    });
    await audit({
      action: "MENU_CATEGORY_CREATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: cat.id, name: cat.name },
    });
    revalidatePath(`/${slug}/menu`);
    return { ok: true, data: { id: cat.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A category with that name already exists.",
        fieldErrors: { name: "Pick a different name" },
      };
    }
    throw err;
  }
}

export async function updateCategoryAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit the menu." };

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const existing = await prisma.menuCategory.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Category not found." };

  try {
    await prisma.menuCategory.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        nameUr: parsed.data.nameUr || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        scheduledStartMin: parsed.data.scheduledStartMin ?? null,
        scheduledEndMin: parsed.data.scheduledEndMin ?? null,
      },
    });
    await audit({
      action: "MENU_CATEGORY_UPDATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: existing.id },
    });
    revalidatePath(`/${slug}/menu`);
    return { ok: true, data: { id: existing.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A category with that name already exists.",
        fieldErrors: { name: "Pick a different name" },
      };
    }
    throw err;
  }
}

export async function deleteCategoryAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit the menu." };

  const parsed = categoryDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const cat = await prisma.menuCategory.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
  });
  if (!cat) return { ok: false, error: "Category not found." };
  if (cat._count.items > 0) {
    return {
      ok: false,
      error: `This category has ${cat._count.items} item(s). Move or delete them first.`,
    };
  }
  await prisma.menuCategory.update({
    where: { id: cat.id },
    data: { deletedAt: new Date() },
  });
  await audit({
    action: "MENU_CATEGORY_DELETED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: cat.id },
  });
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: null };
}

export async function reorderCategoriesAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = categoryReorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  // Confirm every id belongs to this tenant
  const owned = await prisma.menuCategory.findMany({
    where: { tenantId: ctx.tenantId, id: { in: parsed.data.ids }, deletedAt: null },
    select: { id: true },
  });
  if (owned.length !== parsed.data.ids.length)
    return { ok: false, error: "Some categories are not in this tenant." };

  await prisma.$transaction(
    parsed.data.ids.map((id, idx) =>
      prisma.menuCategory.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: null };
}

// ── Items ───────────────────────────────────────────────────────────

export async function createItemAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit the menu." };

  const parsed = itemCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Confirm category belongs to tenant
  const cat = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!cat) return { ok: false, error: "That category was not found.", fieldErrors: { categoryId: "Pick another category" } };

  const item = await prisma.menuItem.create({
    data: {
      tenantId: ctx.tenantId,
      categoryId: data.categoryId,
      name: data.name,
      nameUr: data.nameUr || null,
      description: data.description || null,
      photoUrl: data.photoUrl || null,
      prepTimeMinutes: data.prepTimeMinutes,
      isAvailable: data.isAvailable,
      variants: {
        create: data.variants.map((v, idx) => ({
          name: v.name,
          priceCents: rupeesToPaisa(v.priceRupees),
          isDefault: v.isDefault,
          isAvailable: v.isAvailable,
          sortOrder: idx,
        })),
      },
      modifierGroups: {
        create: data.modifierGroups.map((g, gIdx) => ({
          name: g.name,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          sortOrder: gIdx,
          modifiers: {
            create: g.modifiers.map((m, mIdx) => ({
              name: m.name,
              priceDeltaCents: rupeesToPaisa(m.priceDeltaRupees),
              isAvailable: m.isAvailable,
              sortOrder: mIdx,
            })),
          },
        })),
      },
    },
  });

  await audit({
    action: "MENU_ITEM_CREATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: item.id, name: item.name },
  });
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: { id: item.id } };
}

export async function updateItemAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit the menu." };

  const parsed = itemUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const item = await prisma.menuItem.findFirst({
    where: { id: data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!item) return { ok: false, error: "Item not found." };

  // Confirm category belongs to tenant
  const cat = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!cat)
    return { ok: false, error: "That category was not found.", fieldErrors: { categoryId: "Pick another category" } };

  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id: item.id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        nameUr: data.nameUr || null,
        description: data.description || null,
        photoUrl: data.photoUrl || null,
        prepTimeMinutes: data.prepTimeMinutes,
        isAvailable: data.isAvailable,
      },
    });

    // Replace variants & modifier groups (simpler than diffing for Phase 2).
    // Recipes (Module 3) reference variantId, so when we add recipes, switch
    // this to a diff-based update so variant IDs don't change underfoot.
    await tx.menuVariant.deleteMany({ where: { itemId: item.id } });
    await tx.menuVariant.createMany({
      data: data.variants.map((v, idx) => ({
        itemId: item.id,
        name: v.name,
        priceCents: rupeesToPaisa(v.priceRupees),
        isDefault: v.isDefault,
        isAvailable: v.isAvailable,
        sortOrder: idx,
      })),
    });

    await tx.modifierGroup.deleteMany({ where: { itemId: item.id } });
    for (let gIdx = 0; gIdx < data.modifierGroups.length; gIdx++) {
      const g = data.modifierGroups[gIdx]!;
      await tx.modifierGroup.create({
        data: {
          itemId: item.id,
          name: g.name,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          sortOrder: gIdx,
          modifiers: {
            create: g.modifiers.map((m, mIdx) => ({
              name: m.name,
              priceDeltaCents: rupeesToPaisa(m.priceDeltaRupees),
              isAvailable: m.isAvailable,
              sortOrder: mIdx,
            })),
          },
        },
      });
    }
  });

  await audit({
    action: "MENU_ITEM_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: item.id },
  });
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: { id: item.id } };
}

export async function deleteItemAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit the menu." };

  const parsed = itemDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const item = await prisma.menuItem.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!item) return { ok: false, error: "Item not found." };

  await prisma.menuItem.update({
    where: { id: item.id },
    data: { deletedAt: new Date(), isAvailable: false },
  });
  await audit({
    action: "MENU_ITEM_DELETED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: item.id },
  });
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: null };
}

export async function toggleItemAvailabilityAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = itemToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const item = await prisma.menuItem.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!item) return { ok: false, error: "Item not found." };
  await prisma.menuItem.update({
    where: { id: item.id },
    data: { isAvailable: parsed.data.isAvailable },
  });
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: null };
}
