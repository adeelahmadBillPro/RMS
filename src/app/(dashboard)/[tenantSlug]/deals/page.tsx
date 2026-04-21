import { notFound } from "next/navigation";
import { Tag } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { DealsWorkspace } from "@/components/deals/deals-workspace";

export const dynamic = "force-dynamic";

export default async function DealsPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const deals = await prisma.deal.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const canDelete = ctx.membership.role === "OWNER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">DEALS & PROMOS</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <Tag className="h-6 w-6 text-primary" />
          Deals
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Set up percent-off, flat-off, or free-delivery banners — shown on your
          customer site and applied at checkout.
        </p>
      </header>
      <DealsWorkspace
        slug={params.tenantSlug}
        canManage={canManage}
        canDelete={canDelete}
        deals={deals.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle,
          type: d.type,
          percentBps: d.percentBps,
          flatOffCents: d.flatOffCents,
          minOrderCents: d.minOrderCents,
          heroImageUrl: d.heroImageUrl,
          bgColor: d.bgColor,
          ctaLabel: d.ctaLabel,
          startsAt: d.startsAt.toISOString(),
          endsAt: d.endsAt?.toISOString() ?? null,
          isActive: d.isActive,
          sortOrder: d.sortOrder,
        }))}
      />
    </div>
  );
}
