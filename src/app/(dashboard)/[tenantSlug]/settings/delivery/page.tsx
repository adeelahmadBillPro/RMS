import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { DeliveryZonesForm } from "@/components/delivery/delivery-zones-form";

export const dynamic = "force-dynamic";

export default async function DeliverySettingsPage({
  params,
}: {
  params: { tenantSlug: string };
}) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      hasDelivery: true,
      deliveryAreas: true,
      deliveryFeeCents: true,
      deliveryMinOrderCents: true,
      deliveryRadiusKm: true,
    },
  });
  if (!tenant) notFound();
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-2 text-h2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery zones
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Tell us where you deliver and what it costs. Customers entering an address
          outside these areas will see a friendly "out of zone" message at checkout.
        </p>
      </header>
      {!tenant.hasDelivery ? (
        <div className="rounded-xl border border-warning bg-warning-subtle p-3 text-sm text-warning">
          Delivery channel is <strong>off</strong> for this tenant. Enable it in the
          onboarding or tenant settings to accept delivery orders.
        </div>
      ) : null}
      <DeliveryZonesForm
        slug={params.tenantSlug}
        canManage={canManage}
        initial={{
          deliveryAreas: tenant.deliveryAreas,
          deliveryFeeRupees: tenant.deliveryFeeCents / 100,
          deliveryMinOrderRupees: tenant.deliveryMinOrderCents / 100,
          deliveryRadiusKm: tenant.deliveryRadiusKm ? Number(tenant.deliveryRadiusKm) : null,
        }}
      />
    </div>
  );
}
