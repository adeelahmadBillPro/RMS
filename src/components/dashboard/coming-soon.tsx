import * as React from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * Reusable "coming soon" layout used for sidebar modules whose pages
 * haven't been wired up yet. Keeps the full sidebar navigable end-to-end
 * rather than throwing 404s — each placeholder previews what the module
 * will do when it ships.
 */
export function ComingSoon({
  label,
  title,
  tagline,
  phase,
  features,
  icon,
}: {
  label: string;
  title: string;
  tagline: string;
  phase: string;
  features: { title: string; body: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="container space-y-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-foreground-muted">{label}</p>
          <h1 className="mt-1 text-h1">{title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{tagline}</p>
        </div>
        <Badge variant="info" pulse>
          {phase}
        </Badge>
      </header>

      <Card className="relative overflow-hidden border-primary/40 bg-primary-subtle/30">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {icon}
          </span>
          <div>
            <h2 className="flex items-center gap-2 text-h3">
              <Sparkles className="h-4 w-4 text-primary" />
              Shipping in {phase}
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              The schema, design tokens and tenant plumbing for this module are already
              in place — the UI lights up next.
            </p>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-h3">What you’ll get</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="animate-fade-in rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <p className="text-sm font-medium">{f.title}</p>
              <p className="mt-1 text-xs text-foreground-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
