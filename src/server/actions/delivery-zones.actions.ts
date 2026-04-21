"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { audit } from "@/lib/audit/log";
import { rupeesToPaisa } from "@/lib/utils";
import { deliveryZonesSchema } from "@/lib/validations/delivery-zones.schema";
import type { ActionResult } from "./auth.actions";

function canManage(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

export async function updateDeliveryZonesAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Only owners and managers can change delivery settings." };
  const parsed = deliveryZonesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid delivery settings." };
  const d = parsed.data;

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      deliveryAreas: d.deliveryAreas,
      deliveryFeeCents: rupeesToPaisa(d.deliveryFeeRupees),
      deliveryMinOrderCents: rupeesToPaisa(d.deliveryMinOrderRupees),
      deliveryRadiusKm:
        d.deliveryRadiusKm != null
          ? new Prisma.Decimal(d.deliveryRadiusKm.toFixed(2))
          : null,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { module: "delivery-zones" },
  });
  revalidatePath(`/${slug}/settings/delivery`);
  revalidatePath(`/r/${slug}`);
  return { ok: true, data: null };
}
