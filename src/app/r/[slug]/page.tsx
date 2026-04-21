import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Bike,
  Flame,
  Phone,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, HorizontalScroll } from "@/components/ui/carousel";
import { DealsGrid } from "@/components/customer/deals-grid";
import { ReviewsSection } from "@/components/customer/reviews-section";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicLanding({ params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      brandColor: true,
      contactPhone: true,
      hasDelivery: true,
      hasTakeaway: true,
    },
  });
  if (!tenant) notFound();

  const now = new Date();
  const [categories, featuredItems, activeDeals, reviews, reviewAgg] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId: tenant.id, deletedAt: null, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          where: { deletedAt: null, isAvailable: true, photoUrl: { not: null } },
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { photoUrl: true },
        },
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
    }),
    prisma.menuItem.findMany({
      where: { tenantId: tenant.id, deletedAt: null, isAvailable: true, photoUrl: { not: null } },
      orderBy: { sortOrder: "asc" },
      take: 10,
      include: {
        variants: {
          where: { deletedAt: null, isDefault: true },
          take: 1,
          select: { priceCents: true },
        },
      },
    }),
    prisma.deal.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    prisma.review.findMany({
      where: { tenantId: tenant.id, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.review.aggregate({
      where: { tenantId: tenant.id, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const authorIds = Array.from(new Set(reviews.map((r) => r.userId)));
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true },
        })
      : [];
  const authorNameById = new Map(authors.map((a) => [a.id, a.name]));

  const primaryChannel = tenant.hasTakeaway
    ? "TAKEAWAY"
    : tenant.hasDelivery
      ? "DELIVERY"
      : "DINE_IN";
  const menuUrl = (channel: string) => `/r/${params.slug}/menu?channel=${channel}`;

  return (
    <div className="space-y-6 pb-10">
      {/* ── HERO — live tenant deals carousel, or branded fallback ─── */}
      <section className="container pt-4">
        {activeDeals.length === 0 ? (
          <div
            className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-3xl shadow-md md:h-[340px]"
            style={{ background: tenant.brandColor || "hsl(var(--primary))" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative flex flex-col items-center gap-4 px-6 text-center text-white">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-16 w-16 rounded-2xl bg-white/95 object-cover p-1 shadow-md"
                />
              ) : null}
              <h1 className="max-w-md text-3xl font-bold leading-tight drop-shadow md:text-4xl">
                Welcome to {tenant.name}
              </h1>
              <Button asChild size="lg" variant="secondary" className="bg-white text-foreground hover:bg-white/95">
                <Link href={menuUrl(primaryChannel)}>
                  Browse menu
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Carousel autoplayMs={5000} className="shadow-md">
          {activeDeals.map((d) => {
            const valueLabel =
              d.type === "PERCENT_OFF"
                ? `${((d.percentBps ?? 0) / 100).toFixed(0)}% OFF`
                : d.type === "FLAT_OFF"
                  ? `Rs ${Math.round((d.flatOffCents ?? 0) / 100)} OFF`
                  : "FREE DELIVERY";
            return (
              <div
                key={d.id}
                className="relative h-full w-full"
                style={{ background: d.bgColor || tenant.brandColor || "hsl(var(--primary))" }}
              >
                {d.heroImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.heroImageUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover opacity-60"
                    />
                    {/* Floor + gradient: image-bg slides need a guaranteed
                        contrast floor on the text side, otherwise WCAG fails
                        when the underlying image is bright. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-black/30"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/30 to-transparent"
                    />
                  </>
                ) : (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl"
                  />
                )}
                <div className="absolute inset-0 flex flex-col items-start justify-end p-6 text-white md:items-start md:justify-center md:p-10 md:pl-14">
                  <Badge variant="primary" className="bg-white/90 text-primary">
                    <Flame className="mr-1 h-3 w-3" />
                    {valueLabel}
                  </Badge>
                  <h2 className="mt-3 max-w-lg text-3xl font-bold leading-tight drop-shadow md:text-4xl lg:text-5xl">
                    {d.title}
                  </h2>
                  {d.subtitle ? (
                    <p className="mt-2 max-w-md text-sm text-white/90 drop-shadow md:text-base">
                      {d.subtitle}
                    </p>
                  ) : null}
                  {d.minOrderCents > 0 ? (
                    <p className="mt-1 text-xs text-white/80">
                      Min order {formatMoney(d.minOrderCents)}
                    </p>
                  ) : null}
                  <Button asChild size="lg" className="mt-5 shadow-lg">
                    <Link href={menuUrl(primaryChannel)}>
                      {d.ctaLabel ?? "Order now"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
          </Carousel>
        )}
      </section>

      {/* ── INDIVIDUAL DEAL CARDS (KFC-style grid) ──────────────────── */}
      <DealsGrid
        deals={activeDeals.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle,
          type: d.type,
          percentBps: d.percentBps,
          flatOffCents: d.flatOffCents,
          minOrderCents: d.minOrderCents,
          heroImageUrl: d.heroImageUrl,
          bgColor: d.bgColor,
          ctaLabel: d.ctaLabel,
          endsAt: d.endsAt?.toISOString() ?? null,
        }))}
        menuHref={menuUrl(primaryChannel)}
      />

      {/* ── CHANNEL SWITCHER ─────────────────────────────────────────── */}
      <section className="container">
        <div className="grid gap-3 sm:grid-cols-3">
          {tenant.hasTakeaway ? (
            <ChannelBig
              href={menuUrl("TAKEAWAY")}
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Takeaway"
              sub="Pick up in 10–15 min"
              accent
            />
          ) : null}
          {tenant.hasDelivery ? (
            <ChannelBig
              href={menuUrl("DELIVERY")}
              icon={<Bike className="h-5 w-5" />}
              title="Delivery"
              sub="To your doorstep hot"
            />
          ) : null}
          <ChannelBig
            href={`/r/${params.slug}/menu`}
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Browse menu"
            sub="See everything we cook"
          />
        </div>
      </section>

      {/* ── POPULAR NOW (food-first, above categories) ───────────────── */}
      {featuredItems.length > 0 ? (
        <section className="container">
          <header className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-primary">
                Popular now
              </p>
              <h2 className="text-h2">Most loved</h2>
            </div>
            <Link
              href={menuUrl(primaryChannel)}
              className="text-sm font-medium text-primary hover:underline"
            >
              See full menu →
            </Link>
          </header>
          <HorizontalScroll>
            {featuredItems.map((it, idx) => (
              <Link
                key={it.id}
                href={menuUrl(primaryChannel)}
                className="group flex w-[200px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:w-[220px]"
              >
                <div className="relative aspect-square overflow-hidden bg-surface-muted">
                  {it.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.photoUrl}
                      alt={it.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : null}
                  {idx < 3 ? (
                    <Badge
                      variant="primary"
                      className="absolute left-2 top-2 bg-primary/95 text-primary-foreground backdrop-blur"
                    >
                      {["#1 pick", "Trending", "Staff fav"][idx]}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-1 font-medium">{it.name}</p>
                  {it.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">
                      {it.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-mono font-semibold">
                      {it.variants[0]?.priceCents ? formatMoney(it.variants[0].priceCents) : "—"}
                    </p>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-110">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </HorizontalScroll>
        </section>
      ) : null}

      {/* ── CATEGORIES STRIP ─────────────────────────────────────────── */}
      {categories.length > 0 ? (
        <section className="container">
          <header className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-primary">
                What’s cooking
              </p>
              <h2 className="text-h2">Pick your craving</h2>
            </div>
            <Link
              href={menuUrl(primaryChannel)}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </header>
          <HorizontalScroll>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`${menuUrl(primaryChannel)}&cat=${c.id}`}
                className="group flex w-[140px] flex-shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:w-[160px]"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary-subtle to-surface-muted">
                  {c.items[0]?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.items[0].photoUrl}
                      alt={c.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <UtensilsCrossed className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {c._count.items} item{c._count.items === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </HorizontalScroll>
        </section>
      ) : null}

      {/* ── CUSTOMER REVIEWS ─────────────────────────────────────────── */}
      <ReviewsSection
        slug={params.slug}
        average={reviewAgg._avg.rating ?? 0}
        total={reviewAgg._count._all}
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          ownerReply: r.ownerReply,
          ownerRepliedAt: r.ownerRepliedAt?.toISOString() ?? null,
          authorName: authorNameById.get(r.userId) ?? null,
        }))}
      />

      {/* ── STICKY FOOTER BAND ───────────────────────────────────────── */}
      {tenant.contactPhone ? (
        <section className="container">
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm md:flex-row">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Phone className="h-4 w-4 text-primary" />
              <span>Need help? Call us at</span>
              <a
                href={`tel:${tenant.contactPhone}`}
                className="font-mono font-medium text-foreground hover:text-primary"
              >
                {tenant.contactPhone}
              </a>
            </div>
            <Button asChild size="sm">
              <Link href={menuUrl(primaryChannel)}>
                Start your order
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ChannelBig({
  href,
  icon,
  title,
  sub,
  accent = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent
          ? "border-primary/60 bg-gradient-to-br from-primary-subtle to-background"
          : "border-border bg-background hover:border-primary/50"
      }`}
    >
      <span
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${
          accent ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary-subtle text-primary"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="truncate text-xs text-foreground-muted">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-foreground-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

