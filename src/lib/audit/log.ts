import { prisma } from "@/lib/db/client";
import type { AuditAction, Prisma } from "@prisma/client";
import { headers } from "next/headers";

type LogInput = {
  action: AuditAction;
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function audit({ action, tenantId, userId, metadata }: LogInput) {
  const h = headers();
  await prisma.auditLog.create({
    data: {
      action,
      tenantId: tenantId ?? null,
      userId: userId ?? null,
      metadata,
      ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent") ?? null,
    },
  });
}
