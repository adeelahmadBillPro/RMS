import Link from "next/link";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function formatPkr(paisa: number): string {
  const r = Math.round(paisa / 100);
  return `Rs ${r.toLocaleString("en-PK")}`;
}

const FEATURE_LABELS = [
  { key: "maxBranches", label: "Branches" },
  { key: "maxStaff", label: "Staff seats" },
  { key: "maxMenuItems", label: "Menu items" },
  { key: "maxMonthlyOrders", label: "Orders / month" },
  { key: "deliveryZonesEnabled", label: "Delivery zones" },
  { key: "whatsappEnabled", label: "WhatsApp inbox" },
  { key: "customDomainEnabled", label: "Custom domain" },
  { key: "prioritySupport", label: "Priority support" },
  { key: "apiEnabled", label: "API access" },
] as const;

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: { sortOrder: "asc" },
  });
  const monthly = plans.filter((p) => p.interval === "MONTH");
  const lifetime = plans.find((p) => p.interval === "LIFETIME");

  return (
    <div className="container py-12">
      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wide text-primary">
          Simple, honest pricing
        </p>
        <h1 className="mt-2 text-h1">Pick your plan</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Start free. Upgrade when you grow. Or buy once and own EasyMenu forever.
        </p>
      </header>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-primary-subtle px-3 py-1 text-primary">Monthly</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {monthly.map((p) => (
            <PlanCard
              key={p.id}
              name={p.name}
              tagline={p.tagline}
              description={p.description}
              priceLabel={p.priceCents === 0 ? "Free" : formatPkr(p.priceCents)}
              priceSub={p.priceCents === 0 ? "for 14 days" : "/ month"}
              compareLabel={
                p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents
                  ? formatPkr(p.compareAtPriceCents)
                  : null
              }
              featured={p.isFeatured}
              icon={
                p.code === "starter" ? (
                  <Zap className="h-5 w-5" />
                ) : p.code === "growth" ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Crown className="h-5 w-5" />
                )
              }
              features={FEATURE_LABELS.map((f) => ({
                label: f.label,
                value: planValueFor(p, f.key),
              }))}
              cta="Start free trial"
              ctaHref={`/signup?plan=${p.code}`}
            />
          ))}
        </div>
      </section>

      {lifetime ? (
        <section className="mt-10">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 shadow-md">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
            />
            <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <Badge variant="primary" className="bg-primary text-primary-foreground">
                  <Crown className="mr-1 h-3 w-3" /> Buy once, own forever
                </Badge>
                <h2 className="mt-3 text-h2">{lifetime.name}</h2>
                <p className="mt-1 max-w-xl text-sm text-foreground-muted">
                  {lifetime.description}
                </p>
                <div className="mt-4 flex items-baseline gap-3">
                  <p className="font-mono text-3xl font-bold">{formatPkr(lifetime.priceCents)}</p>
                  {lifetime.compareAtPriceCents && lifetime.compareAtPriceCents > lifetime.priceCents ? (
                    <p className="font-mono text-sm text-foreground-muted line-through">
                      {formatPkr(lifetime.compareAtPriceCents)}
                    </p>
                  ) : null}
                  <p className="text-xs text-foreground-muted">one-time</p>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {FEATURE_LABELS.map((f) => (
                    <li key={f.key} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span className="text-foreground-muted">{f.label}:</span>
                      <span className="font-medium">{planValueFor(lifetime, f.key)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild size="lg" className="md:self-center">
                <Link href={`/signup?plan=${lifetime.code}`}>Buy lifetime</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Need something custom? White-label, 10+ branches, SLA?
        </p>
        <a
          href="mailto:sales@easymenu.dev"
          className="mt-2 inline-block font-medium text-primary hover:underline"
        >
          Talk to us →
        </a>
      </section>
    </div>
  );
}

function planValueFor(
  plan: Record<string, unknown>,
  key: (typeof FEATURE_LABELS)[number]["key"],
): string {
  const v = plan[key];
  if (typeof v === "boolean") return v ? "Yes" : "—";
  if (typeof v === "number") {
    if (v >= 9999) return "Unlimited";
    return v.toLocaleString();
  }
  return "—";
}

function PlanCard({
  name,
  tagline,
  description,
  priceLabel,
  priceSub,
  compareLabel,
  featured,
  icon,
  features,
  cta,
  ctaHref,
}: {
  name: string;
  tagline: string | null;
  description: string | null;
  priceLabel: string;
  priceSub: string;
  compareLabel: string | null;
  featured: boolean;
  icon: React.ReactNode;
  features: { label: string; value: string }[];
  cta: string;
  ctaHref: string;
}) {
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        featured
          ? "border-primary bg-gradient-to-b from-primary/5 to-background ring-1 ring-primary"
          : "border-border bg-background"
      }`}
    >
      {featured ? (
        <Badge
          variant="primary"
          className="absolute right-4 top-4 bg-primary text-primary-foreground shadow-sm"
        >
          Most popular
        </Badge>
      ) : null}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          featured ? "bg-primary text-primary-foreground" : "bg-primary-subtle text-primary"
        }`}
      >
        {icon}
      </span>
      <h3 className="mt-3 text-h3">{name}</h3>
      {tagline ? <p className="text-xs font-medium text-primary">{tagline}</p> : null}
      {description ? (
        <p className="mt-1 text-xs text-foreground-muted">{description}</p>
      ) : null}
      <div className="mt-4 flex items-baseline gap-2">
        <p className="font-mono text-3xl font-bold">{priceLabel}</p>
        <p className="text-xs text-foreground-muted">{priceSub}</p>
      </div>
      {compareLabel ? (
        <p className="font-mono text-xs text-foreground-muted line-through">{compareLabel}</p>
      ) : null}
      <ul className="mt-4 flex-1 space-y-1.5 text-sm">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 flex-shrink-0 text-success" />
            <span className="text-foreground-muted">{f.label}:</span>
            <span className="font-medium">{f.value}</span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-5" variant={featured ? "primary" : "secondary"}>
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </article>
  );
}
