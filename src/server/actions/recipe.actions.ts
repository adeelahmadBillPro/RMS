"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { recipeUpsertSchema } from "@/lib/validations/inventory.schema";
import { refreshRecipeCost } from "@/lib/inventory/cost";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function requireManager(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

export async function upsertRecipeAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ recipeId: string; costCents: number }>> {
  const ctx = await getTenantContext(slug);
  if (!requireManager(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = recipeUpsertSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Confirm variant belongs to this tenant (via the parent item)
  const variant = await prisma.menuVariant.findFirst({
    where: {
      id: data.variantId,
      deletedAt: null,
      item: { tenantId: ctx.tenantId, deletedAt: null },
    },
    select: { id: true, item: { select: { id: true, name: true } } },
  });
  if (!variant) return { ok: false, error: "Menu variant not found." };

  const ingredientIds = data.items.map((i) => i.ingredientId);
  // Detect duplicate ingredients in payload (cheap pre-check, doesn't race).
  if (new Set(ingredientIds).size !== ingredientIds.length) {
    return { ok: false, error: "Each ingredient may appear at most once per recipe." };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Re-validate ingredient ownership INSIDE the tx so concurrent deletes
    // can't slip past the check (TOCTOU).
    if (ingredientIds.length > 0) {
      const owned = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds }, tenantId: ctx.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (owned.length !== new Set(ingredientIds).size) {
        throw new Error("INGREDIENT_NOT_OWNED");
      }
    }

    const recipe = await tx.recipe.upsert({
      where: { variantId: data.variantId },
      update: { notes: data.notes || null },
      create: {
        variantId: data.variantId,
        notes: data.notes || null,
      },
    });

    // Diff items
    const existing = await tx.recipeItem.findMany({
      where: { recipeId: recipe.id },
      select: { id: true, ingredientId: true },
    });
    const incomingByIng = new Map(data.items.map((i) => [i.ingredientId, i]));
    for (const ex of existing) {
      if (!incomingByIng.has(ex.ingredientId)) {
        await tx.recipeItem.delete({ where: { id: ex.id } });
      }
    }
    const existingByIng = new Map(existing.map((e) => [e.ingredientId, e.id]));
    for (const it of data.items) {
      const eId = existingByIng.get(it.ingredientId);
      if (eId) {
        await tx.recipeItem.update({
          where: { id: eId },
          data: {
            quantity: new Prisma.Decimal(it.quantity.toFixed(3)),
            wastagePercent: it.wastagePercent,
          },
        });
      } else {
        await tx.recipeItem.create({
          data: {
            recipeId: recipe.id,
            ingredientId: it.ingredientId,
            quantity: new Prisma.Decimal(it.quantity.toFixed(3)),
            wastagePercent: it.wastagePercent,
          },
        });
      }
    }
    const costCents = await refreshRecipeCost(tx, recipe.id);
    return { recipeId: recipe.id, costCents };
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INGREDIENT_NOT_OWNED") {
      return { error: "One or more ingredients are not in this tenant." } as const;
    }
    throw err;
  });

  if ("error" in result) return { ok: false, error: result.error };

  await audit({
    action: "RECIPE_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { variantId: data.variantId, costCents: result.costCents },
  });
  revalidatePath(`/${slug}/recipes`);
  revalidatePath(`/${slug}/menu`);
  return { ok: true, data: result };
}
