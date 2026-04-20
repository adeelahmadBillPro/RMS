import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsHome({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    include: { _count: { select: { branches: { where: { deletedAt: null } } } } },
  });
  if (!tenant) notFound();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Link href={`/${params.tenantSlug}/settings/branches`} className="group">
        <Card className="transition-colors group-hover:border-border-strong">
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>
              {tenant._count.branches} branch{tenant._count.branches === 1 ? "" : "es"}
            </CardDescription>
          </CardHeader>
          <p className="text-sm text-foreground-muted">
            Add outlets, set tax / service rates, mark the primary branch for the POS.
          </p>
        </Card>
      </Link>
    </div>
  );
}
