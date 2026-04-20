import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { BranchManager } from "@/components/branch/branch-manager";

export const dynamic = "force-dynamic";

export default async function BranchesPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const branches = await prisma.branch.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const canDelete = ctx.membership.role === "OWNER";

  return (
    <Card>
      {branches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No branches yet"
          description="Add your first outlet so the POS, KDS, and inventory can attach to it."
        />
      ) : null}
      <BranchManager
        slug={params.tenantSlug}
        canManage={canManage}
        canDelete={canDelete}
        branches={branches.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          phone: b.phone,
          isPrimary: b.isPrimary,
          isActive: b.isActive,
          taxBps: b.taxBps,
          serviceBps: b.serviceBps,
        }))}
      />
    </Card>
  );
}
