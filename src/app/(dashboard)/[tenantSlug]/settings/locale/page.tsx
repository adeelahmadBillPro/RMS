import { notFound } from "next/navigation";
import { Globe } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantLocaleForm } from "@/components/settings/tenant-locale-form";

export const dynamic = "force-dynamic";

export default async function LocaleSettingsPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { currency: true, timezone: true, locale: true },
  });
  if (!tenant) notFound();
  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-2 text-h2">
          <Globe className="h-5 w-5 text-primary" />
          Localization
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Currency, timezone, and language affect receipts, timestamps, and the
          customer site.
        </p>
      </header>
      <TenantLocaleForm slug={params.tenantSlug} canManage={canManage} initial={tenant} />
    </div>
  );
}
