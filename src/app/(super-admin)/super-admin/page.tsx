import Link from "next/link";
import { Building2, Users, ShieldCheck, CreditCard } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SuperAdminHome() {
  const [tenantCount, userCount, activeSubs, pendingInvoices] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: { in: ["TRIALING", "ACTIVE", "LIFETIME"] } } }),
    prisma.planInvoice.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="container space-y-6 py-6">
      <div>
        <p className="font-mono text-xs text-foreground-muted">PLATFORM</p>
        <h1 className="mt-1 text-h1">Super admin</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tenants" value={tenantCount} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Users" value={userCount} icon={<Users className="h-4 w-4" />} />
        <StatCard
          label="Active subscriptions"
          value={activeSubs}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Manage subscriptions, extend trials, impersonate.</CardDescription>
          </CardHeader>
          <Link
            href="/super-admin/tenants"
            className="text-sm text-primary hover:underline"
          >
            Open tenants list →
          </Link>
        </Card>
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <CardTitle>
              Billing
              {pendingInvoices > 0 ? (
                <Badge variant="warning" className="ml-2">
                  {pendingInvoices} pending
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              Verify bank / wallet payments and activate plan upgrades.
            </CardDescription>
          </CardHeader>
          <Link
            href="/super-admin/billing"
            className="text-sm text-primary hover:underline"
          >
            Open billing →
          </Link>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground-muted">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-mono text-h2">{value}</p>
    </div>
  );
}
