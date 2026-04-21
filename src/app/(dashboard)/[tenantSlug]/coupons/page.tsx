import { notFound } from "next/navigation";
import { Tag } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { CouponsWorkspace } from "@/components/coupons/coupons-workspace";

export const dynamic = "force-dynamic";

export default async function CouponsPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const coupons = await prisma.coupon.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const canDelete = ctx.membership.role === "OWNER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">PROMO CODES</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <Tag className="h-6 w-6 text-primary" />
          Coupons
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Promo codes customers can enter at checkout. Server validates the cap +
          minimum order so the discount is always honest.
        </p>
      </header>
      <CouponsWorkspace
        slug={params.tenantSlug}
        canManage={canManage}
        canDelete={canDelete}
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          percentBps: c.percentBps,
          flatOffCents: c.flatOffCents,
          maxDiscountCents: c.maxDiscountCents,
          minOrderCents: c.minOrderCents,
          maxRedemptions: c.maxRedemptions,
          redemptionsCount: c.redemptionsCount,
          validUntil: c.validUntil?.toISOString() ?? null,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
