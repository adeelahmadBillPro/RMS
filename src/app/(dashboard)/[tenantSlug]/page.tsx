import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  ChefHat,
  ExternalLink,
  Flame,
  PackageSearch,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
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
    include: { subscription: { include: { plan: true } } },
  });
  if (!tenant) notFound();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [
    categories,
    itemCount,
    ordersToday,
    ordersYesterday,
    activeOrders,
    lowStockCount,
    topItems,
  ] = await Promise.all([
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
      select: {
        id: true,
        totalCents: true,
        status: true,
        channel: true,
        orderNumber: true,
        customerName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: {
        tenantId: ctx.tenantId,
        createdAt: { gte: yesterdayStart, lt: todayStart },
        status: { not: "CANCELLED" },
      },
      select: { totalCents: true },
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
    prisma.menuItem.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, isAvailable: true, photoUrl: { not: null } },
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: { id: true, name: true, photoUrl: true },
    }),
  ]);

  const revenueToday = ordersToday.reduce((s, o) => s + o.totalCents, 0);
  const revenueYesterday = ordersYesterday.reduce((s, o) => s + o.totalCents, 0);
  const revenueDelta =
    revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : null;
  const completedToday = ordersToday.filter((o) => o.status === "COMPLETED").length;
  const avgTicketCents = ordersToday.length > 0 ? Math.round(revenueToday / ordersToday.length) : 0;

  // Bucket today's orders into 24 hourly slots for the sparkline chart
  const hourlyRevenue = Array.from({ length: 24 }, () => 0);
  const hourlyCount = Array.from({ length: 24 }, () => 0);
  for (const o of ordersToday) {
    const h = new Date(o.createdAt).getHours();
    if (h >= 0 && h < 24) {
      hourlyRevenue[h] = (hourlyRevenue[h] ?? 0) + o.totalCents;
      hourlyCount[h] = (hourlyCount[h] ?? 0) + 1;
    }
  }
  const peakHour =
    hourlyCount.reduce((peakIdx, v, i) => (v > (hourlyCount[peakIdx] ?? 0) ? i : peakIdx), 0);
  const maxHourRev = Math.max(1, ...hourlyRevenue);
  const recentOrders = ordersToday.slice(0, 5);

  const trialEndsAt = tenant.subscription?.trialEndsAt;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const slug = params.tenantSlug;
  const greeting = new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="min-h-full">
      <div className="container space-y-6 py-6">
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="relative animate-slide-in-down overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/90 via-primary to-primary-hover p-6 text-primary-foreground shadow-md md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="flex items-center gap-1.5 font-mono text-xs text-white/85 drop-shadow-sm">
                <Flame className="h-3.5 w-3.5" />
                {greeting}
              </p>
              <h1 className="mt-2 text-h1 drop-shadow-md md:text-display">{tenant.name}</h1>
              <p className="mt-1 text-sm text-white/85 drop-shadow-sm">
                {ordersToday.length === 0
                  ? "Let’s cook up your first order of the day."
                  : activeOrders > 0
                    ? `${activeOrders} order${activeOrders === 1 ? "" : "s"} in the kitchen right now.`
                    : `${ordersToday.length} served today · avg ticket ${formatMoney(avgTicketCents)}`}
              </p>
            </div>

            {/* Revenue card floating inside the hero */}
            <div className="w-full min-w-[240px] rounded-2xl bg-background/95 p-4 text-foreground shadow-lg backdrop-blur md:w-auto">
              <p className="text-xs uppercase tracking-wide text-foreground-muted">Today’s revenue</p>
              <p className="mt-1 font-mono text-3xl font-bold">{formatMoney(revenueToday)}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {revenueDelta !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                      revenueDelta >= 0
                        ? "bg-success-subtle text-success"
                        : "bg-danger-subtle text-danger"
                    }`}
                  >
                    <TrendingUp
                      className={`h-3 w-3 ${revenueDelta < 0 ? "rotate-180" : ""}`}
                    />
                    {revenueDelta >= 0 ? "+" : ""}
                    {revenueDelta}% vs yesterday
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-foreground-muted">
                    First day of orders
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="bg-white/95 text-foreground hover:bg-white">
              <Link href={`/${slug}/orders`}>
                <ShoppingBag className="h-4 w-4" />
                Order board
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href={`/r/${slug}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                View customer site
              </Link>
            </Button>
            {daysLeft !== null ? (
              <Badge variant={daysLeft > 3 ? "info" : "warning"} className="ml-auto bg-white/95">
                <CalendarClock className="mr-1.5 h-3 w-3" />
                Trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </Badge>
            ) : null}
          </div>
        </section>

        {/* ── STATS ROW ────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill
            label="Active orders"
            value={String(activeOrders)}
            hint={activeOrders > 0 ? "In the pipeline" : "All caught up"}
            tone={activeOrders > 0 ? "info" : "neutral"}
            delayMs={120}
          />
          <StatPill
            label="Completed today"
            value={String(completedToday)}
            hint="Served"
            tone="success"
            delayMs={180}
          />
          <StatPill
            label="Avg ticket"
            value={avgTicketCents > 0 ? formatMoney(avgTicketCents) : "—"}
            hint={ordersToday.length === 0 ? "Start an order" : `${ordersToday.length} orders`}
            tone="primary"
            delayMs={240}
          />
          <StatPill
            label="Menu items"
            value={String(itemCount)}
            hint={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
            tone="neutral"
            delayMs={300}
          />
        </div>

        {/* ── QUICK TILES ──────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickTile
            href={`/${slug}/orders`}
            icon={<Receipt className="h-5 w-5" />}
            title="Order board"
            subtitle={activeOrders > 0 ? `${activeOrders} active` : "All clear"}
            accent={activeOrders > 0}
            delayMs={360}
          />
          <QuickTile
            href={`/${slug}/recipes`}
            icon={<ChefHat className="h-5 w-5" />}
            title="Recipes"
            subtitle="Costing & prep notes"
            delayMs={420}
          />
          <QuickTile
            href={`/${slug}/menu`}
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Menu"
            subtitle={`${itemCount} items`}
            delayMs={480}
          />
          <QuickTile
            href={`/${slug}/inventory`}
            icon={<PackageSearch className="h-5 w-5" />}
            title="Inventory"
            subtitle={lowStockCount > 0 ? `${lowStockCount} low-stock` : "Stock healthy"}
            accent={lowStockCount > 0}
            delayMs={540}
          />
        </div>

        {/* ── HOURLY CHART + RECENT ORDERS ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section
            className="rounded-2xl border border-border bg-background p-5 opacity-0 animate-slide-up"
            style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
          >
            <header className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-muted">
                  Today by hour
                </p>
                <h2 className="text-h3">Revenue pulse</h2>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-foreground-muted">Peak</p>
                <p className="font-mono text-sm font-semibold">
                  {hourlyCount[peakHour] && hourlyCount[peakHour] > 0
                    ? `${String(peakHour).padStart(2, "0")}:00 · ${hourlyCount[peakHour]} orders`
                    : "—"}
                </p>
              </div>
            </header>
            {/* Simple SVG-free bar chart */}
            <div className="relative h-32 rounded-xl bg-surface-muted/40 p-3">
              <div className="flex h-full items-end gap-[2px]">
                {hourlyRevenue.map((rev, h) => {
                  const height = Math.max(2, Math.round((rev / maxHourRev) * 100));
                  const isPeak = h === peakHour && (hourlyCount[peakHour] ?? 0) > 0;
                  const hasData = rev > 0;
                  return (
                    <div
                      key={h}
                      title={`${String(h).padStart(2, "0")}:00 — ${hourlyCount[h] ?? 0} order${(hourlyCount[h] ?? 0) === 1 ? "" : "s"} · ${formatMoney(rev)}`}
                      className={`flex-1 rounded-t-sm transition-all duration-300 ${
                        isPeak
                          ? "bg-primary"
                          : hasData
                            ? "bg-primary/60"
                            : "bg-surface-muted"
                      }`}
                      style={{ height: hasData ? `${height}%` : "2px" }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-foreground-subtle">
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>23</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              {ordersToday.length > 0
                ? `${ordersToday.length} order${ordersToday.length === 1 ? "" : "s"} today · ${formatMoney(revenueToday)} total`
                : "No orders yet today — hover the POS to take your first one."}
            </p>
          </section>

          {/* Recent orders feed */}
          <section
            className="flex flex-col rounded-2xl border border-border bg-background p-5 opacity-0 animate-slide-up"
            style={{ animationDelay: "680ms", animationFillMode: "forwards" }}
          >
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-muted">Latest</p>
                <h2 className="text-h3">Recent orders</h2>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/${slug}/orders`}>
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </header>
            {recentOrders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-foreground-muted">
                No orders yet today.
              </p>
            ) : (
              <ul className="flex-1 divide-y divide-border">
                {recentOrders.map((o) => {
                  const minutesAgo = Math.max(
                    0,
                    Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60_000),
                  );
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/${slug}/orders`}
                        className="group flex items-center gap-3 py-2 transition-colors hover:bg-surface-muted/60"
                      >
                        <span
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                            o.status === "COMPLETED"
                              ? "bg-success-subtle text-success"
                              : o.status === "READY" || o.status === "OUT_FOR_DELIVERY"
                                ? "bg-warning-subtle text-warning"
                                : "bg-info-subtle text-info"
                          }`}
                        >
                          #{o.orderNumber.toString().padStart(4, "0").slice(-3)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-xs font-medium">
                            <span className="truncate">
                              {o.customerName ?? o.channel.replace("_", " ")}
                            </span>
                          </p>
                          <p className="text-[10px] text-foreground-muted">
                            {o.channel.replace("_", " ").toLowerCase()} ·{" "}
                            {minutesAgo < 1 ? "just now" : `${minutesAgo}m ago`}
                          </p>
                        </div>
                        <p className="font-mono text-xs">{formatMoney(o.totalCents)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ── TOP ITEMS + SHARE MENU ────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* Featured items */}
          <section
            className="rounded-2xl border border-border bg-background p-5 opacity-0 animate-slide-up"
            style={{ animationDelay: "760ms", animationFillMode: "forwards" }}
          >
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-h3">Your menu highlights</h2>
                <p className="mt-0.5 text-sm text-foreground-muted">
                  What customers see first on your menu
                </p>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/${slug}/menu`}>
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </header>
            {topItems.length === 0 ? (
              <EmptyState
                title="No items yet"
                description="Add menu items with photos and they'll show up here."
                icon={<Sparkles className="h-5 w-5" />}
                action={
                  <Button asChild size="sm">
                    <Link href={`/${slug}/menu`}>Open menu</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {topItems.map((it) => (
                  <div
                    key={it.id}
                    className="group overflow-hidden rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="aspect-square overflow-hidden bg-surface-muted">
                      {it.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.photoUrl}
                          alt={it.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <p className="line-clamp-1 p-2 text-xs font-medium">{it.name}</p>
                  </div>
                ))}
              </div>
            )}
            {categories.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted"
                  >
                    {c.name}
                    <span className="ml-1.5 font-mono text-[10px] text-foreground-subtle">
                      {c._count.items}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Share menu */}
          <section
            className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary-subtle via-primary-subtle/60 to-background p-5 opacity-0 animate-slide-up"
            style={{ animationDelay: "840ms", animationFillMode: "forwards" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl"
            />
            <div className="relative">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <h2 className="text-h3">Share your customer menu</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Anyone with the link can order — no app install, no login.
              </p>
              <div className="mt-4 space-y-2">
                <code className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
                  <ExternalLink className="h-3 w-3 text-primary" />
                  <Link href={`/r/${slug}`} target="_blank" className="truncate hover:text-primary">
                    easymenu.app/r/{slug}
                  </Link>
                </code>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/r/${slug}`} target="_blank">
                      Open customer site
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/${slug}/tables`}>Print QR codes</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  hint,
  tone = "neutral",
  delayMs = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "info" | "success" | "warning" | "neutral";
  delayMs?: number;
}) {
  const toneBg: Record<string, string> = {
    primary: "bg-primary-subtle text-primary",
    info: "bg-info-subtle text-info",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    neutral: "bg-surface-muted text-foreground-muted",
  };
  return (
    <div
      className="rounded-2xl border border-border bg-background p-4 opacity-0 transition-all duration-200 animate-slide-up hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${toneBg[tone]}`}>
          {label}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}

function QuickTile({
  href,
  icon,
  title,
  subtitle,
  accent = false,
  delayMs = 0,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: boolean;
  delayMs?: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "forwards" }}
      className={`group flex items-center gap-3 rounded-2xl border bg-background p-4 opacity-0 transition-all duration-200 animate-slide-up hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-primary/60 bg-primary-subtle/40" : "border-border hover:border-primary/50"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${
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
