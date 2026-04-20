"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import type { ActionResult } from "./auth.actions";

export async function markNotificationReadAction(
  slug: string,
  id: string,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  await prisma.notification.updateMany({
    where: {
      id,
      tenantId: ctx.tenantId,
      OR: [{ userId: ctx.userId }, { userId: null }],
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath(`/${slug}`);
  return { ok: true, data: null };
}

export async function markAllNotificationsReadAction(
  slug: string,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  await prisma.notification.updateMany({
    where: {
      tenantId: ctx.tenantId,
      OR: [{ userId: ctx.userId }, { userId: null }],
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath(`/${slug}`);
  return { ok: true, data: null };
}
