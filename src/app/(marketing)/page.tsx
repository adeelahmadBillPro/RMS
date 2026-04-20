import Link from "next/link";
import {
  ChefHat,
  Receipt,
  PackageSearch,
  Users,
  Truck,
  MessagesSquare,
  ArrowRight,
  Clock,
  ShieldCheck,
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
    icon: Truck,
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
        {/* Ambient orange glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="container relative grid gap-10 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div className="animate-fade-in space-y-6 lg:pr-4">
            <Badge variant="primary">
              <Star className="mr-1.5 h-3 w-3 fill-primary" />
              Built for restaurants · cafes · fast food · bakeries
            </Badge>
            <h1 className="text-h1 md:text-display">
              Run your restaurant from{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                one calm, fast workspace.
              </span>
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

          {/* Hero visual: stacked food photo + floating stat cards */}
          <div className="relative hidden min-h-[420px] animate-fade-in lg:block">
            <div className="absolute inset-0 overflow-hidden rounded-3xl border border-border shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=900&fit=crop"
                alt="Zinger burger"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />
            </div>
            <FloatingCard
              className="absolute -bottom-6 -left-6 w-56"
              title="Order #0042"
              subtitle="Ready in 8 min"
              accent="success"
              icon={<ChefHat className="h-4 w-4" />}
            />
            <FloatingCard
              className="absolute -right-4 top-10 w-60"
              title="+ Rs 12,450 today"
              subtitle="23 orders · avg 6.2 min"
              accent="primary"
              icon={<Receipt className="h-4 w-4" />}
            />
            <FloatingCard
              className="absolute right-12 bottom-12 w-48"
              title="Food cost 34%"
              subtitle="Margin up 4% vs Mon"
              accent="info"
              icon={<PackageSearch className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="primary" className="mb-3">What you get</Badge>
          <h2 className="text-h2">Everything you need, nothing you don’t.</h2>
          <p className="mt-3 text-body text-foreground-muted">
            One platform replacing five spreadsheets, three notebooks and that one
            WhatsApp group.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              className="group animate-fade-in rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary transition-transform duration-200 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-h3">{f.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{f.body}</p>
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
