import Link from "next/link";
import {
  ChefHat,
  Receipt,
  PackageSearch,
  Users,
  Bike,
  MessagesSquare,
  ArrowRight,
  Check,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Star,
  Zap,
} from "lucide-react";
import { APP } from "@/lib/config/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Receipt,
    title: "Unified order inbox",
    body: "Dine-in, takeaway, delivery, WhatsApp & online — one board.",
  },
  {
    icon: ChefHat,
    title: "Recipes & food cost",
    body: "Know exactly what each plate costs. Auto-deduct stock on every sale.",
  },
  {
    icon: PackageSearch,
    title: "Inventory that actually works",
    body: "FIFO valuation, wastage logs, low-stock alerts, supplier dues.",
  },
  {
    icon: Users,
    title: "Staff, shifts, payroll",
    body: "PIN-based attendance, shift planning, salary slips in one place.",
  },
  {
    icon: Bike,
    title: "Delivery on autopilot",
    body: "Assign riders, track cash collected, reconcile end-of-shift.",
  },
  {
    icon: MessagesSquare,
    title: "WhatsApp orders",
    body: "Convert messages into structured orders with one click.",
  },
];

const highlights = [
  { icon: Clock, label: "Menu live in 10 min" },
  { icon: ShieldCheck, label: "No credit card for trial" },
  { icon: Zap, label: "Works on any device" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Single ambient glow — two competed for attention */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="container relative grid gap-10 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div className="animate-fade-in space-y-6 lg:pr-4">
            <Badge variant="primary">
              <Star className="mr-1.5 h-3 w-3 fill-primary" />
              Built for restaurants · cafes · fast food · bakeries
            </Badge>
            <h1 className="text-h1 md:text-display">
              Run your restaurant from one calm, fast workspace.
            </h1>
            <p className="max-w-xl text-body-lg text-foreground-muted">
              {APP.name} is the all-in-one POS, kitchen display, inventory &amp; delivery
              platform. Take orders from QR tables, WhatsApp, your public menu link and
              your counter — track every rupee from plate cost to profit.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/r/burgerhub">See a live demo →</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground-muted">
              {highlights.map((h) => (
                <li key={h.label} className="flex items-center gap-1.5">
                  <h.icon className="h-3.5 w-3.5 text-primary" />
                  {h.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero visual: real-food collage. Owners see what their menu can
              look like — appetite first, features later. */}
          <div className="relative hidden min-h-[460px] animate-fade-in lg:block">
            <div className="grid h-full grid-cols-2 grid-rows-2 gap-3">
              <div className="relative col-span-1 row-span-2 overflow-hidden rounded-3xl border border-border shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=1200&fit=crop"
                  alt="Pepperoni pizza, fresh from the oven"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
                  Pizza · Rs 1,200
                </span>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop"
                  alt="Beef burger with sesame bun"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
                  Burger · Rs 750
                </span>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-border shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1633321088355-d0f81134ca3b?w=800&h=600&fit=crop"
                  alt="Chicken shawarma wrap"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
                  Shawarma · Rs 450
                </span>
              </div>
            </div>

            {/* Single floating revenue card — proof the system runs the kitchen,
                not just shows pretty pictures. */}
            <FloatingCard
              className="absolute -right-4 top-6 w-60"
              title="+ Rs 12,450 today"
              subtitle="23 orders · 6 min avg"
              accent="primary"
              icon={<Receipt className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      {/* Your customer sees this — phone preview band. Sells the customer-side
          experience before the operations features. */}
      <section className="border-b border-border bg-surface">
        <div className="container grid gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <Badge variant="primary">Your customers see this</Badge>
            <h2 className="text-h2">A menu that makes them hungry — in 10 minutes.</h2>
            <p className="text-body text-foreground-muted">
              Upload your dishes once. Customers get a proper food-app experience —
              swipeable hero deals, popular picks, one-tap add to cart, live order
              tracking with kitchen → rider updates.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                  <Check className="h-3 w-3" />
                </span>
                <span>Your branding · your colors · your domain (Growth+)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                  <Check className="h-3 w-3" />
                </span>
                <span>Guest checkout — phone is identity, no friction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
                  <Check className="h-3 w-3" />
                </span>
                <span>Live tracking — customer sees the kitchen → rider in real time</span>
              </li>
            </ul>
            <Button asChild>
              <Link href="/r/burgerhub" target="_blank" rel="noopener">
                Tap through a real menu →
              </Link>
            </Button>
          </div>

          {/* Phone-shape mockup of the customer menu */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-foreground bg-background shadow-xl">
              <div className="aspect-[9/19] bg-background">
                {/* Hero image */}
                <div className="relative h-[28%] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-2 px-3 text-white">
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold">
                      30% OFF
                    </span>
                    <p className="mt-1 text-sm font-bold leading-tight drop-shadow">Today only — Pizza Friday</p>
                  </div>
                </div>
                {/* Category chips */}
                <div className="flex gap-1.5 overflow-hidden px-3 py-2">
                  {["Pizza", "Burgers", "Sides", "Drinks"].map((c, i) => (
                    <span
                      key={c}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-foreground-muted"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                {/* Item cards (2-col mini) */}
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {[
                    { src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop", name: "Pepperoni", price: "Rs 1,200" },
                    { src: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=300&h=300&fit=crop", name: "BBQ Chicken", price: "Rs 1,400" },
                    { src: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=300&fit=crop", name: "Margherita", price: "Rs 950" },
                    { src: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300&h=300&fit=crop", name: "Veggie", price: "Rs 850" },
                  ].map((it) => (
                    <div key={it.name} className="overflow-hidden rounded-xl border border-border bg-surface">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.src} alt="" className="aspect-square w-full object-cover" />
                      <div className="px-2 py-1.5">
                        <p className="truncate text-[10px] font-semibold leading-tight">{it.name}</p>
                        <p className="font-mono text-[10px] text-foreground-muted">{it.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Sticky "View cart" pill mock */}
                <div className="px-3">
                  <div className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-[10px] font-semibold text-primary-foreground shadow-md">
                    <ShoppingBag className="h-3 w-3" />
                    2 items · Rs 2,150
                  </div>
                </div>
              </div>
            </div>
            {/* Floating "live" indicator on phone — sells realtime */}
            <div className="absolute -right-3 top-12 flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live
            </div>
          </div>
        </div>
      </section>

      {/* Features — left-aligned header + asymmetric grid (1 large highlight,
          5 smaller). Avoids the 3-col centered AI-slop pattern. */}
      <section className="container py-20">
        <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:items-end">
          <div>
            <Badge variant="primary" className="mb-3">What you get</Badge>
            <h2 className="text-h2">Everything you need, nothing you don’t.</h2>
          </div>
          <p className="text-body text-foreground-muted">
            One platform replacing five spreadsheets, three notebooks and that one
            WhatsApp group nobody reads anymore.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {/* Highlight feature — spans 2 columns on md+, larger image card */}
          <div className="group relative col-span-1 overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md md:col-span-2 md:row-span-2">
            <div className="relative aspect-[16/9] md:aspect-[21/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=600&fit=crop"
                alt="Restaurant kitchen team plating dishes"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <Receipt className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-2xl font-bold drop-shadow md:text-3xl">
                  Unified order inbox
                </h3>
                <p className="mt-1 max-w-md text-sm text-white/90 drop-shadow">
                  Dine-in, takeaway, delivery, WhatsApp & online — one board, one
                  flow, never miss a ticket.
                </p>
              </div>
            </div>
          </div>

          {/* Remaining 5 features — smaller cards, no decorative icons-in-circles
              (that's the slop pattern). Title front, body back. */}
          {features.slice(1).map((f, i) => (
            <div
              key={f.title}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              className="group animate-fade-in rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-transform duration-200 group-hover:scale-110">
                  <f.icon className="h-4 w-4" />
                </span>
                <h3 className="text-base font-semibold">{f.title}</h3>
              </div>
              <p className="mt-2 text-sm text-foreground-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[80%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="container relative py-16 text-center">
          <h2 className="text-h2">Ready to stop juggling tabs?</h2>
          <p className="mt-3 text-body text-foreground-muted">
            Start your free trial and have your menu live in under ten minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start free trial</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/r/burgerhub">Browse the demo menu</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FloatingCard({
  className,
  title,
  subtitle,
  accent,
  icon,
}: {
  className?: string;
  title: string;
  subtitle: string;
  accent: "primary" | "success" | "info";
  icon: React.ReactNode;
}) {
  const tones = {
    primary: "bg-primary-subtle text-primary",
    success: "bg-success-subtle text-success",
    info: "bg-info-subtle text-info",
  } as const;
  return (
    <div
      className={`animate-fade-in rounded-xl border border-border bg-background p-3 shadow-md ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[accent]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-foreground-muted">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
