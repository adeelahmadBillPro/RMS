"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import {
  tableCreateSchema,
  tableDeleteSchema,
  tableStatusSchema,
  tableUpdateSchema,
} from "@/lib/validations/order.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

function canManage(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

export async function createTableAction(slug: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = tableCreateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const branch = await prisma.branch.findFirst({
    where: { id: parsed.data.branchId, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!branch)
    return { ok: false, error: "Branch not found.", fieldErrors: { branchId: "Pick another" } };

  try {
    const t = await prisma.restaurantTable.create({
      data: {
        tenantId: ctx.tenantId,
        branchId: parsed.data.branchId,
        label: parsed.data.label,
        seats: parsed.data.seats,
      },
    });
    await audit({
      action: "TABLE_CREATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: t.id, label: t.label },
    });
    revalidatePath(`/${slug}/tables`);
    return { ok: true, data: { id: t.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A table with that label already exists in this branch.",
        fieldErrors: { label: "Pick another label" },
      };
    }
    throw err;
  }
}

export async function updateTableAction(slug: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = tableUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };

  const existing = await prisma.restaurantTable.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Table not found." };

  try {
    await prisma.restaurantTable.update({
      where: { id: existing.id },
      data: { label: parsed.data.label, seats: parsed.data.seats, branchId: parsed.data.branchId },
    });
    await audit({
      action: "TABLE_UPDATED",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      metadata: { id: existing.id },
    });
    revalidatePath(`/${slug}/tables`);
    return { ok: true, data: { id: existing.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "A table with that label already exists in this branch.",
        fieldErrors: { label: "Pick another label" },
      };
    }
    throw err;
  }
}

export async function deleteTableAction(slug: string, input: unknown): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER")
    return { ok: false, error: "Only owners can delete tables." };
  const parsed = tableDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const t = await prisma.restaurantTable.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!t) return { ok: false, error: "Table not found." };
  await prisma.restaurantTable.update({
    where: { id: t.id },
    data: { deletedAt: new Date(), status: "FREE" },
  });
  await audit({
    action: "TABLE_DELETED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { id: t.id },
  });
  revalidatePath(`/${slug}/tables`);
  return { ok: true, data: null };
}

export async function setTableStatusAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role) && ctx.membership.role !== "WAITER" && ctx.membership.role !== "CASHIER")
    return { ok: false, error: "Forbidden." };
  const parsed = tableStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const t = await prisma.restaurantTable.findFirst({
    where: { id: parsed.data.id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!t) return { ok: false, error: "Table not found." };
  await prisma.restaurantTable.update({
    where: { id: t.id },
    data: { status: parsed.data.status },
  });
  revalidatePath(`/${slug}/tables`);
  return { ok: true, data: null };
}
