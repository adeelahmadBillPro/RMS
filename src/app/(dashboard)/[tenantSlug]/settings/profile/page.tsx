import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantProfileForm } from "@/components/settings/tenant-profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      name: true,
      cuisineType: true,
      contactPhone: true,
      logoUrl: true,
      brandColor: true,
    },
  });
  if (!tenant) notFound();
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-2 text-h2">
          <Store className="h-5 w-5 text-primary" />
          Restaurant profile
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Public name, logo, brand color and contact details shown on your
          customer site and receipts.
        </p>
      </header>
      <TenantProfileForm
        slug={params.tenantSlug}
        canManage={canManage}
        initial={{
          name: tenant.name,
          cuisineType: tenant.cuisineType,
          contactPhone: tenant.contactPhone ?? "",
          logoUrl: tenant.logoUrl ?? "",
          brandColor: tenant.brandColor ?? "",
        }}
      />
    </div>
  );
}
