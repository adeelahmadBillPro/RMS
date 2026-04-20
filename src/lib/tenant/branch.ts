import { prisma } from "@/lib/db/client";

/**
 * Returns the primary branch for a tenant, or null if none exist.
 * Phase 2 modules pin to this branch unless the user has switched
 * via the topbar branch picker (Phase 3 will add per-session selection).
 */
export async function getPrimaryBranchId(tenantId: string): Promise<string | null> {
  const b = await prisma.branch.findFirst({
    where: { tenantId, isPrimary: true, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (b) return b.id;
  // Fallback: any active branch
  const any = await prisma.branch.findFirst({
    where: { tenantId, deletedAt: null, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return any?.id ?? null;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
