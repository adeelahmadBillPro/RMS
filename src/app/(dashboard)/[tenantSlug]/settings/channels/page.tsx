import { notFound } from "next/navigation";
import { Waypoints } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantChannelsForm } from "@/components/settings/tenant-channels-form";

export const dynamic = "force-dynamic";

export default async function ChannelsSettingsPage({
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
      hasTakeaway: true,
      acceptCash: true,
      acceptCard: true,
      acceptJazzCash: true,
      acceptEasypaisa: true,
      acceptBankTransfer: true,
    },
  });
  if (!tenant) notFound();
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-2 text-h2">
          <Waypoints className="h-5 w-5 text-primary" />
          Channels & payments
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Decide how customers order and which payment methods you accept.
        </p>
      </header>
      <TenantChannelsForm slug={params.tenantSlug} canManage={canManage} initial={tenant} />
    </div>
  );
}
