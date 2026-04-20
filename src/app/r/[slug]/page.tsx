import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Clock,
  CreditCard,
  Flame,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, HorizontalScroll } from "@/components/ui/carousel";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HERO_SLIDES: { title: string; sub: string; img: string; cta: string }[] = [
  {
    title: "Hot, fresh & at your door",
    sub: "Order in a few taps — kitchen is already waiting.",
    img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1600&h=900&fit=crop",
    cta: "Order now",
  },
  {
    title: "Smash the hunger",
    sub: "Our signature beef burgers straight off the grill.",
    img: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1600&h=900&fit=crop",
    cta: "Order burgers",
  },
  {
    title: "Crispy sides, chilled drinks",
    sub: "Every combo builds itself — tap to start.",
    img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=1600&h=900&fit=crop",
    cta: "See the menu",
  },
];

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

  const [categories, featuredItems] = await Promise.all([
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
  ]);

  const primaryChannel = tenant.hasTakeaway
    ? "TAKEAWAY"
    : tenant.hasDelivery
      ? "DELIVERY"
      : "DINE_IN";
  const menuUrl = (channel: string) => `/r/${params.slug}/menu?channel=${channel}`;

  return (
    <div className="space-y-6 pb-10">
      {/* ── HERO CAROUSEL ────────────────────────────────────────────── */}
      <section className="container pt-4">
        <Carousel autoplayMs={4000} className="shadow-md">
          {HERO_SLIDES.map((slide, i) => (
            <div key={i} className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.img}
                alt=""
                aria-hidden
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent md:hidden"
              />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-6 text-white md:items-start md:justify-center md:p-10 md:pl-14">
                <Badge variant="primary" className="bg-primary/90 backdrop-blur">
                  <Flame className="mr-1 h-3 w-3" />
                  Hot deal
                </Badge>
                <h2 className="mt-3 max-w-lg text-3xl font-bold leading-tight drop-shadow md:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/90 drop-shadow md:text-base">
                  {slide.sub}
                </p>
                <Button asChild size="lg" className="mt-5 shadow-lg">
                  <Link href={menuUrl(primaryChannel)}>
                    {slide.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </Carousel>
      </section>

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
              icon={<Truck className="h-5 w-5" />}
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

      {/* ── OFFER BANNER ─────────────────────────────────────────────── */}
      <section className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-hover p-6 text-primary-foreground shadow-md md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-white/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <Badge variant="primary" className="bg-white/20 text-white backdrop-blur">
                <Star className="mr-1 h-3 w-3 fill-white" />
                Limited time
              </Badge>
              <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
                First order? <br />
                Free delivery on us.
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/85">
                Order anywhere above Rs 500 and we’ll take the delivery charge off
                automatically — no code needed.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/95"
            >
              <Link href={menuUrl(primaryChannel)}>
                Claim it now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── POPULAR NOW CAROUSEL ─────────────────────────────────────── */}
      {featuredItems.length > 0 ? (
        <section className="container">
          <header className="mb-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-primary">
                Popular now
              </p>
              <h2 className="text-h2">Most loved 🔥</h2>
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

      {/* ── WHY ORDER WITH US ────────────────────────────────────────── */}
      <section className="container">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard
            icon={<Clock className="h-5 w-5" />}
            title="Made fresh"
            sub="Straight off the grill, never pre-made."
          />
          <InfoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Safe & hygienic"
            sub="Gloves, masks, sealed packaging."
          />
          <InfoCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Pay your way"
            sub="Cash, JazzCash, Easypaisa, card."
          />
        </div>
      </section>

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

function InfoCard({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-foreground-muted">{sub}</p>
      </div>
    </div>
  );
}
