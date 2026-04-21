import { notFound } from "next/navigation";
import Link from "next/link";
import { CreditCard, Crown, Sparkles, Zap } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";

export const dynamic = "force-dynamic";

function formatPkr(paisa: number): string {
  return `Rs ${Math.round(paisa / 100).toLocaleString("en-PK")}`;
}

export default async function BillingPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [sub, plans, invoices] = await Promise.all([
    prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
      include: { plan: true },
    }),
    prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.planInvoice.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!sub) return notFound();

  const isOwner = ctx.membership.role === "OWNER";
  const isLifetime = sub.status === "LIFETIME";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">BILLING</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <CreditCard className="h-6 w-6 text-primary" />
          Your plan & billing
        </h1>
      </header>

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                {sub.plan.code === "starter" ? <Zap className="h-4 w-4" /> :
                 sub.plan.code === "growth" ? <Sparkles className="h-4 w-4" /> :
                 <Crown className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-xs text-foreground-muted">Current plan</p>
                <p className="text-h3">{sub.plan.name}</p>
              </div>
              <Badge variant={isLifetime ? "success" : sub.status === "ACTIVE" ? "success" : "warning"}>
                {sub.status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-2 text-sm">
              {isLifetime ? (
                <span className="font-mono font-bold">{formatPkr(sub.plan.priceCents)} lifetime</span>
              ) : sub.plan.priceCents === 0 ? (
                <span className="font-mono font-bold">Free trial</span>
              ) : (
                <>
                  <span className="font-mono font-bold">{formatPkr(sub.plan.priceCents)}</span>
                  <span className="text-foreground-muted">/ month</span>
                </>
              )}
              {sub.trialEndsAt && sub.status === "TRIALING" ? (
                <span className="text-xs text-foreground-muted">
                  · Trial ends {new Date(sub.trialEndsAt).toLocaleDateString()}
                </span>
              ) : null}
              {sub.currentPeriodEnd && !isLifetime && sub.status !== "TRIALING" ? (
                <span className="text-xs text-foreground-muted">
                  · Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </span>
              ) : null}
              {isLifetime ? (
                <span className="text-xs text-success">· No renewals — forever yours</span>
              ) : null}
            </div>
          </div>
          {isOwner && !isLifetime ? (
            <UpgradeDialog
              slug={params.tenantSlug}
              currentPlanCode={sub.plan.code}
              plans={plans.map((p) => ({
                code: p.code,
                name: p.name,
                tagline: p.tagline,
                interval: p.interval,
                priceCents: p.priceCents,
                compareAtPriceCents: p.compareAtPriceCents,
                currency: p.currency,
              }))}
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background">
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">Plan capabilities</h2>
          <Link
            href="/pricing"
            className="text-xs font-medium text-primary hover:underline"
            target="_blank"
          >
            Compare all plans →
          </Link>
        </header>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-3">
          <Stat label="Branches" value={capNum(sub.plan.maxBranches)} />
          <Stat label="Staff seats" value={capNum(sub.plan.maxStaff)} />
          <Stat label="Menu items" value={capNum(sub.plan.maxMenuItems)} />
          <Stat label="Orders / mo" value={capNum(sub.plan.maxMonthlyOrders)} />
          <Stat label="WhatsApp" value={sub.plan.whatsappEnabled ? "Yes" : "—"} />
          <Stat label="Delivery zones" value={sub.plan.deliveryZonesEnabled ? "Yes" : "—"} />
          <Stat label="Custom domain" value={sub.plan.customDomainEnabled ? "Yes" : "—"} />
          <Stat label="Priority support" value={sub.plan.prioritySupport ? "Yes" : "—"} />
          <Stat label="API access" value={sub.plan.apiEnabled ? "Yes" : "—"} />
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-background">
        <header className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Invoices & payments</h2>
          <p className="text-xs text-foreground-muted">
            Bank transfer / mobile wallet payments are marked pending until an
            admin verifies the proof you uploaded.
          </p>
        </header>
        {invoices.length === 0 ? (
          <p className="p-6 text-center text-sm text-foreground-muted">
            No invoices yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-mono text-xs">
                    {new Date(i.createdAt).toLocaleDateString()} · {i.planCode.toUpperCase()}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {i.method}
                    {i.reference ? ` · ref ${i.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{formatPkr(i.amountCents)}</span>
                  <Badge
                    variant={
                      i.status === "PAID" ? "success" :
                      i.status === "PENDING" ? "warning" :
                      i.status === "FAILED" ? "danger" :
                      "neutral"
                    }
                  >
                    {i.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function capNum(n: number): string {
  if (n >= 9999) return "Unlimited";
  return n.toLocaleString();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
