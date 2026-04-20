import Link from "next/link";
import { Check } from "lucide-react";
import { APP } from "@/lib/config/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    code: "trial",
    name: "Free trial",
    price: "PKR 0",
    period: "14 days",
    description: "Try every feature with no commitment.",
    features: [
      "1 branch, up to 5 staff",
      "Unlimited orders during trial",
      "All POS, KDS, and inventory tools",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    code: "basic",
    name: "Basic",
    price: "PKR 4,500",
    period: "/month",
    description: "Everything a single outlet needs.",
    features: ["1 branch", "Up to 5 staff", "POS + KDS + Inventory", "Reports & exports"],
    cta: "Choose Basic",
    highlight: false,
  },
  {
    code: "pro",
    name: "Pro",
    price: "PKR 9,900",
    period: "/month",
    description: "For growing brands with multiple outlets.",
    features: [
      "Up to 3 branches",
      "Up to 20 staff",
      "WhatsApp ordering inbox",
      "Delivery boy app",
      "Priority support",
    ],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Unlimited outlets, API access, dedicated support.",
    features: ["Unlimited branches & staff", "Public API & webhooks", "SLA & onboarding manager"],
    cta: "Talk to sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <section className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="primary" className="mb-4">
          Simple, predictable pricing
        </Badge>
        <h1 className="text-h1">Pick the plan that fits today.</h1>
        <p className="mt-3 text-body text-foreground-muted">
          Upgrade or downgrade anytime. No setup fees. Cancel from your dashboard.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-4 lg:grid-cols-4">
        {tiers.map((t) => (
          <div
            key={t.code}
            className={`flex flex-col rounded-xl border bg-surface p-6 ${
              t.highlight ? "border-primary ring-1 ring-primary/30" : "border-border"
            }`}
          >
            {t.highlight ? (
              <Badge variant="primary" className="mb-3 self-start">
                Most popular
              </Badge>
            ) : null}
            <h3 className="text-h3">{t.name}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{t.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-h2 font-mono">{t.price}</span>
              <span className="text-sm text-foreground-muted">{t.period}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="text-foreground-muted">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={t.highlight ? "primary" : "secondary"}
              className="mt-6"
            >
              <Link href={t.code === "enterprise" ? `mailto:${APP.supportEmail}` : "/signup"}>
                {t.cta}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-foreground-subtle">
        All plans include unlimited orders, mobile-first interface, dark mode, and bilingual support.
      </p>
    </section>
  );
}
