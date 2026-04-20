import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  ChefHat,
  ExternalLink,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [categories, itemCount, ordersToday, activeOrders, lowStockCount] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { items: { where: { deletedAt: null } } } } },
    }),
    prisma.menuItem.count({ where: { tenantId: ctx.tenantId, deletedAt: null } }),
    prisma.order.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
      },
      select: { id: true, totalCents: true, status: true },
    }),
    prisma.order.count({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["NEW", "PREPARING", "READY", "OUT_FOR_DELIVERY"] },
      },
    }),
    prisma.ingredient.count({
      where: {
        tenantId: ctx.tenantId,
        deletedAt: null,
        isActive: true,
        reorderLevel: { gt: 0 },
        currentStock: { lte: prisma.ingredient.fields.reorderLevel },
      },
    }),
  ]);

  const revenueToday = ordersToday.reduce((s, o) => s + o.totalCents, 0);
  const completedToday = ordersToday.filter((o) => o.status === "COMPLETED").length;

  const trialEndsAt = tenant.subscription?.trialEndsAt;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const slug = params.tenantSlug;

  return (
    <div className="container space-y-6 py-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-foreground-muted">DASHBOARD</p>
          <h1 className="mt-1 text-h1">Welcome, {tenant.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/r/${slug}`} target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
              View customer site
            </Link>
          </Button>
          {daysLeft !== null ? (
            <Badge variant={daysLeft > 3 ? "info" : "warning"}>
              <CalendarClock className="mr-1.5 h-3 w-3" />
              Trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </Badge>
          ) : null}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Today’s revenue"
          value={formatMoney(revenueToday)}
          hint={`${ordersToday.length} order${ordersToday.length === 1 ? "" : "s"}`}
          tone="primary"
        />
        <StatCard
          label="Active orders"
          value={String(activeOrders)}
          hint={activeOrders > 0 ? "In the pipeline" : "All caught up"}
          tone={activeOrders > 0 ? "info" : "neutral"}
        />
        <StatCard
          label="Completed today"
          value={String(completedToday)}
          hint="Served"
          tone="success"
        />
        <StatCard
          label="Menu items"
          value={String(itemCount)}
          hint={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
          tone="neutral"
        />
      </div>

      {/* Quick-link tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickTile
          href={`/${slug}/pos`}
          icon={<ShoppingBag className="h-5 w-5" />}
          title="Open POS"
          subtitle="Take orders at the counter"
        />
        <QuickTile
          href={`/${slug}/orders`}
          icon={<Receipt className="h-5 w-5" />}
          title="Order board"
          subtitle={activeOrders > 0 ? `${activeOrders} active` : "All clear"}
          accent={activeOrders > 0}
        />
        <QuickTile
          href={`/${slug}/kds`}
          icon={<ChefHat className="h-5 w-5" />}
          title="Kitchen display"
          subtitle="Full-screen KDS"
        />
        <QuickTile
          href={`/${slug}/inventory`}
          icon={<PackageSearch className="h-5 w-5" />}
          title="Inventory"
          subtitle={lowStockCount > 0 ? `${lowStockCount} low-stock` : "Stock healthy"}
          accent={lowStockCount > 0}
        />
      </div>

      {/* Menu snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Your menu</CardTitle>
          <CardDescription>Categories you’re running.</CardDescription>
        </CardHeader>
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Add menu categories to get started organizing your items."
            icon={<Sparkles className="h-5 w-5" />}
            action={
              <Button asChild>
                <Link href={`/${slug}/menu`}>Open menu</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="rounded-full bg-surface-muted px-3 py-1 text-sm text-foreground-muted"
                >
                  {c.name}
                  <span className="ml-1.5 font-mono text-xs text-foreground-subtle">
                    {c._count.items}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${slug}/menu`}>
                Manage menu <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </Card>

      {/* Public link */}
      <Card className="border-primary/40 bg-primary-subtle/30">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <CardTitle>Share your customer menu</CardTitle>
          <CardDescription>
            Anyone with the link can order — no app install, no login.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
            {tenant.id ? (
              <Link href={`/r/${slug}`} target="_blank" className="hover:text-primary">
                /r/{slug}
              </Link>
            ) : null}
          </code>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/${slug}/tables`}>Print table QR codes</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/r/${slug}`} target="_blank">
              Open customer site
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "info" | "success" | "warning" | "neutral";
}) {
  const toneBar: Record<string, string> = {
    primary: "from-primary/60 to-primary",
    info: "from-info/60 to-info",
    success: "from-success/60 to-success",
    warning: "from-warning/60 to-warning",
    neutral: "from-border to-border-strong",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${toneBar[tone]}`}
        aria-hidden
      />
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-2 font-mono text-h2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}

function QuickTile({
  href,
  icon,
  title,
  subtitle,
  accent = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-primary/50 bg-primary-subtle/40" : "border-border hover:border-primary/50"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${
          accent ? "bg-primary text-primary-foreground" : "bg-primary-subtle text-primary"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-foreground-muted">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-foreground-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
