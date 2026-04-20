import Link from "next/link";
import {
  ChefHat,
  Receipt,
  PackageSearch,
  Users,
  Truck,
  MessagesSquare,
  ArrowRight,
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

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="container py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="primary" className="mb-6">
              Built for restaurants, cafes, fast food & bakeries
            </Badge>
            <h1 className="text-h1 md:text-display">
              Run your restaurant from one calm, fast workspace.
            </h1>
            <p className="mt-6 text-body-lg text-foreground-muted">
              {APP.name} handles orders, recipes, inventory, staff, deliveries
              and payments — so you can focus on the food.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start 14-day free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-foreground-subtle">
              No credit card required. English & Urdu support.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-h2">Everything you need, nothing you don’t.</h2>
          <p className="mt-3 text-body text-foreground-muted">
            One platform replacing five spreadsheets, three notebooks and that one WhatsApp group.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-h3">{f.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface">
        <div className="container py-16 text-center">
          <h2 className="text-h2">Ready to stop juggling tabs?</h2>
          <p className="mt-3 text-body text-foreground-muted">
            Start your free trial and have your menu live in under ten minutes.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
