import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Receipt, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { withTenant } from "@/lib/db/with-tenant";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function TenantHome({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    include: {
      subscription: { include: { plan: true } },
    },
  });
  if (!tenant) notFound();

  const categories = await withTenant(ctx.tenantId, (tx) =>
    tx.menuCategorySeed.findMany({ orderBy: { sortOrder: "asc" } }),
  );

  const trialEndsAt = tenant.subscription?.trialEndsAt;
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  return (
    <div className="container space-y-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-foreground-muted">DASHBOARD</p>
          <h1 className="mt-1 text-h1">Welcome, {tenant.name}</h1>
        </div>
        {daysLeft !== null ? (
          <Badge variant={daysLeft > 3 ? "info" : "warning"}>
            <CalendarClock className="mr-1.5 h-3 w-3" />
            Trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </Badge>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Today’s revenue" value="—" hint="Live in Phase 2" />
        <StatCard label="Orders today" value="0" hint="No POS yet" />
        <StatCard label="Active staff" value="1" hint="That’s you" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your menu categories</CardTitle>
          <CardDescription>From onboarding step 3.</CardDescription>
        </CardHeader>
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Add menu categories to get started organizing your items."
            icon={<Sparkles className="h-5 w-5" />}
            action={
              <Button asChild>
                <Link href={`/${params.tenantSlug}/menu`}>Open menu (Phase 2)</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm text-foreground-muted"
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What’s next</CardTitle>
          <CardDescription>Phase 1 ships the workspace skeleton. The order pipeline and KDS arrive in Phase 2.</CardDescription>
        </CardHeader>
        <ul className="space-y-2 text-sm text-foreground-muted">
          <li className="flex items-start gap-2">
            <Receipt className="mt-0.5 h-4 w-4 text-primary" />
            POS, KDS, and the unified order board (Phase 2).
          </li>
          <li className="flex items-start gap-2">
            <Receipt className="mt-0.5 h-4 w-4 text-primary" />
            Recipes + cost-per-plate + auto-deduct stock (Phase 2).
          </li>
          <li className="flex items-start gap-2">
            <Receipt className="mt-0.5 h-4 w-4 text-primary" />
            Public ordering, WhatsApp inbox, delivery PWA (Phase 3).
          </li>
        </ul>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-2 font-mono text-h2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}
