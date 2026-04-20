"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { rupeesToPaisa } from "@/lib/utils";
import { applyStockMovement } from "@/lib/inventory/stock";
import {
  ingredientCreateSchema,
  ingredientDeleteSchema,
  ingredientUpdateSchema,
  stockAdjustSchema,
  stockInSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  wastageLogSchema,
} from "@/lib/validations/inventory.schema";
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

// ── Suppliers ───────────────────────────────────────────────────────

export async function createSupplierAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can edit suppliers." };
  const parsed = supplierCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const s = await prisma.supplier.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        isActive: parsed.data.isActive,
      },
    });
    await audit({
      action: "SUPPLIER_CREATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: s.id },
    });
    revalidatePath(`/${slug}/inventory`);
    return { ok: true, data: { id: s.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A supplier with that name already exists.", fieldErrors: { name: "Pick a different name" } };
    }
    throw err;
  }
}

export async function updateSupplierAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = supplierUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const existing = await prisma.supplier.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Supplier not found." };
  try {
    await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        isActive: parsed.data.isActive,
      },
    });
    await audit({
      action: "SUPPLIER_UPDATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: existing.id },
    });
    revalidatePath(`/${slug}/inventory`);
    return { ok: true, data: { id: existing.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A supplier with that name already exists.", fieldErrors: { name: "Pick a different name" } };
    }
    throw err;
  }
}

// ── Ingredients ─────────────────────────────────────────────────────

export async function createIngredientAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = ingredientCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  if (data.supplierId) {
    const sup = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!sup) return { ok: false, error: "Supplier not in this tenant.", fieldErrors: { supplierId: "Pick another supplier" } };
  }

  try {
    const ing = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredient.create({
        data: {
          tenantId: ctx.tenantId,
          name: data.name,
          unit: data.unit,
          reorderLevel: new Prisma.Decimal(data.reorderLevel.toFixed(3)),
          avgCostCents: rupeesToPaisa(data.openingCostRupees),
          supplierId: data.supplierId || null,
          isActive: data.isActive,
        },
      });
      if (data.openingStock > 0) {
        await applyStockMovement(tx, {
          tenantId: ctx.tenantId,
          ingredientId: created.id,
          reason: "STOCK_TAKE",
          deltaQty: data.openingStock,
          unitCostCents: rupeesToPaisa(data.openingCostRupees),
          notes: "Opening stock",
          createdById: ctx.userId,
        });
      }
      return created;
    });
    await audit({
      action: "INGREDIENT_CREATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: ing.id, name: ing.name },
    });
    revalidatePath(`/${slug}/inventory`);
    return { ok: true, data: { id: ing.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An ingredient with that name already exists.", fieldErrors: { name: "Pick a different name" } };
    }
    throw err;
  }
}

export async function updateIngredientAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = ingredientUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const existing = await prisma.ingredient.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Ingredient not found." };

  if (parsed.data.supplierId) {
    const sup = await prisma.supplier.findFirst({
      where: { id: parsed.data.supplierId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!sup) return { ok: false, error: "Supplier not in this tenant.", fieldErrors: { supplierId: "Pick another supplier" } };
  }

  try {
    await prisma.ingredient.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        unit: parsed.data.unit,
        reorderLevel: new Prisma.Decimal(parsed.data.reorderLevel.toFixed(3)),
        supplierId: parsed.data.supplierId || null,
        isActive: parsed.data.isActive,
      },
    });
    await audit({
      action: "INGREDIENT_UPDATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: existing.id },
    });
    revalidatePath(`/${slug}/inventory`);
    return { ok: true, data: { id: existing.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An ingredient with that name already exists.", fieldErrors: { name: "Pick a different name" } };
    }
    throw err;
  }
}

export async function deleteIngredientAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER")
    return { ok: false, error: "Only owners can delete ingredients." };
  const parsed = ingredientDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const ing = await prisma.ingredient.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
    include: { _count: { select: { recipeItems: true } } },
  });
  if (!ing) return { ok: false, error: "Ingredient not found." };
  if (ing._count.recipeItems > 0)
    return {
      ok: false,
      error: `This ingredient is used in ${ing._count.recipeItems} recipe item(s). Remove from recipes first.`,
    };
  await prisma.ingredient.update({
    where: { id: ing.id },
    data: { deletedAt: new Date(), isActive: false },
  });
  await audit({
    action: "INGREDIENT_DELETED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: ing.id },
  });
  revalidatePath(`/${slug}/inventory`);
  return { ok: true, data: null };
}

// ── Stock-in (Purchase) ─────────────────────────────────────────────

export async function recordStockInAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ purchaseId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = stockInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Validate FK ownership for supplier + branch + ingredients
  if (data.branchId) {
    const b = await prisma.branch.findFirst({
      where: { id: data.branchId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!b) return { ok: false, error: "Branch not found.", fieldErrors: { branchId: "Pick another" } };
  }
  if (data.supplierId) {
    const s = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!s) return { ok: false, error: "Supplier not found.", fieldErrors: { supplierId: "Pick another" } };
  }
  const ingredientIds = data.items.map((i) => i.ingredientId);
  const owned = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds }, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (owned.length !== ingredientIds.length)
    return { ok: false, error: "One or more ingredients are not in this tenant." };

  const totalCents = data.items.reduce(
    (sum, it) => sum + Math.round(it.quantity * 1000) * rupeesToPaisa(it.unitCostRupees) / 1000,
    0,
  );

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: data.branchId || null,
        supplierId: data.supplierId || null,
        billNumber: data.billNumber || null,
        notes: data.notes || null,
        totalCents: Math.round(totalCents),
        createdById: ctx.userId,
        items: {
          create: data.items.map((it) => ({
            ingredientId: it.ingredientId,
            quantity: new Prisma.Decimal(it.quantity.toFixed(3)),
            unitCostCents: rupeesToPaisa(it.unitCostRupees),
          })),
        },
      },
      include: { items: true },
    });
    for (const it of p.items) {
      await applyStockMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: data.branchId || null,
        ingredientId: it.ingredientId,
        reason: "PURCHASE",
        deltaQty: Number(it.quantity),
        unitCostCents: it.unitCostCents,
        refType: "PURCHASE_ITEM",
        refId: it.id,
        createdById: ctx.userId,
      });
    }
    return p;
  });

  await audit({
    action: "STOCK_RECEIVED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { purchaseId: purchase.id, totalCents: purchase.totalCents, items: purchase.items.length },
  });
  revalidatePath(`/${slug}/inventory`);
  return { ok: true, data: { purchaseId: purchase.id } };
}

// ── Wastage ─────────────────────────────────────────────────────────

export async function logWastageAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = wastageLogSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const ing = await prisma.ingredient.findFirst({
    where: { id: data.ingredientId, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!ing) return { ok: false, error: "Ingredient not found." };
  if (Number(ing.currentStock) < data.quantity) {
    return {
      ok: false,
      error: `Insufficient stock: ${Number(ing.currentStock)} available, you tried to deduct ${data.quantity}.`,
    };
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      return applyStockMovement(tx, {
        tenantId: ctx.tenantId,
        branchId: data.branchId || null,
        ingredientId: data.ingredientId,
        reason: "WASTAGE",
        deltaQty: -data.quantity,
        unitCostCents: ing.avgCostCents,
        wastageReason: data.reason,
        notes: data.notes || null,
        refType: "WASTAGE_LOG",
        createdById: ctx.userId,
      });
    });
    await audit({
      action: "STOCK_WASTED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { ingredientId: data.ingredientId, quantity: data.quantity, reason: data.reason },
    });
    revalidatePath(`/${slug}/inventory`);
    return { ok: true, data: { id: movement.id } };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return { ok: false, error: "Insufficient stock." };
    }
    throw err;
  }
}

// ── Adjustment / stock-take ─────────────────────────────────────────

export async function adjustStockAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = stockAdjustSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const ing = await prisma.ingredient.findFirst({
    where: { id: parsed.data.ingredientId, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!ing) return { ok: false, error: "Ingredient not found." };

  const currentStock = Number(ing.currentStock);
  const delta = parsed.data.newQuantity - currentStock;
  if (delta === 0)
    return { ok: false, error: "New quantity matches current — no adjustment needed." };

  const movement = await prisma.$transaction(async (tx) =>
    applyStockMovement(tx, {
      tenantId: ctx.tenantId,
      ingredientId: ing.id,
      reason: "ADJUSTMENT",
      deltaQty: delta,
      unitCostCents: ing.avgCostCents,
      notes: parsed.data.notes || `Stock-take: was ${currentStock}, now ${parsed.data.newQuantity}`,
      refType: "ADJUSTMENT",
      createdById: ctx.userId,
    }),
  );
  await audit({
    action: "STOCK_ADJUSTED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { ingredientId: ing.id, delta },
  });
  revalidatePath(`/${slug}/inventory`);
  return { ok: true, data: { id: movement.id } };
}
