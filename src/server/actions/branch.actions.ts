"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import {
  branchCreateSchema,
  branchDeleteSchema,
  branchUpdateSchema,
} from "@/lib/validations/branch.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrorsFromZod(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path[0]?.toString() ?? "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function createBranchAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "MANAGER") {
    return { ok: false, error: "Only owners and managers can add branches." };
  }

  const parsed = branchCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const branch = await prisma.$transaction(async (tx) => {
      // If this is the first branch OR isPrimary requested, ensure exactly one primary
      const existingPrimary = await tx.branch.findFirst({
        where: { tenantId: ctx.tenantId, isPrimary: true, deletedAt: null },
      });
      const becomePrimary = parsed.data.isPrimary || !existingPrimary;
      if (becomePrimary && existingPrimary) {
        await tx.branch.update({
          where: { id: existingPrimary.id },
          data: { isPrimary: false },
        });
      }
      return tx.branch.create({
        data: {
          tenantId: ctx.tenantId,
          name: parsed.data.name,
          address: parsed.data.address || null,
          phone: parsed.data.phone || null,
          isPrimary: becomePrimary,
          taxBps: parsed.data.taxBps,
          serviceBps: parsed.data.serviceBps,
        },
      });
    });

    await audit({
      action: "BRANCH_CREATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { branchId: branch.id, name: branch.name },
    });
    revalidatePath(`/${slug}/settings/branches`);
    return { ok: true, data: { id: branch.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A branch with that name already exists.",
        fieldErrors: { name: "Pick a different name" },
      };
    }
    throw err;
  }
}

export async function updateBranchAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER" && ctx.membership.role !== "MANAGER") {
    return { ok: false, error: "Only owners and managers can edit branches." };
  }

  const parsed = branchUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  // Confirm branch belongs to tenant
  const existing = await prisma.branch.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Branch not found." };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary && !existing.isPrimary) {
        await tx.branch.updateMany({
          where: { tenantId: ctx.tenantId, isPrimary: true, NOT: { id: existing.id } },
          data: { isPrimary: false },
        });
      }
      // Don't allow demoting the only primary
      if (!parsed.data.isPrimary && existing.isPrimary) {
        const otherActive = await tx.branch.count({
          where: {
            tenantId: ctx.tenantId,
            deletedAt: null,
            isActive: true,
            NOT: { id: existing.id },
          },
        });
        if (otherActive === 0) {
          throw new Error("CANNOT_UNSET_ONLY_PRIMARY");
        }
      }
      await tx.branch.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          address: parsed.data.address || null,
          phone: parsed.data.phone || null,
          isPrimary: parsed.data.isPrimary,
          isActive: parsed.data.isActive,
          taxBps: parsed.data.taxBps,
          serviceBps: parsed.data.serviceBps,
        },
      });
    });
    await audit({
      action: "BRANCH_UPDATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { branchId: existing.id },
    });
    revalidatePath(`/${slug}/settings/branches`);
    return { ok: true, data: { id: existing.id } };
  } catch (err) {
    if (err instanceof Error && err.message === "CANNOT_UNSET_ONLY_PRIMARY") {
      return {
        ok: false,
        error: "You can’t unset the only primary branch — promote another branch first.",
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A branch with that name already exists.",
        fieldErrors: { name: "Pick a different name" },
      };
    }
    throw err;
  }
}

export async function deleteBranchAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER") {
    return { ok: false, error: "Only owners can delete branches." };
  }
  const parsed = branchDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const branch = await prisma.branch.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!branch) return { ok: false, error: "Branch not found." };

  // Block deleting the only branch
  const totalActive = await prisma.branch.count({
    where: { tenantId: ctx.tenantId, deletedAt: null },
  });
  if (totalActive <= 1) {
    return { ok: false, error: "You must keep at least one branch." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.branch.update({
      where: { id: branch.id },
      data: { deletedAt: new Date(), isPrimary: false, isActive: false },
    });
    if (branch.isPrimary) {
      // Promote the most recent remaining branch
      const next = await tx.branch.findFirst({
        where: { tenantId: ctx.tenantId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.branch.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }
  });

  await audit({
    action: "BRANCH_DELETED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { branchId: branch.id },
  });
  revalidatePath(`/${slug}/settings/branches`);
  return { ok: true, data: null };
}
