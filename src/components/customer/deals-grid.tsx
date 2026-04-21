"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export type PublicDeal = {
  id: string;
  title: string;
  subtitle: string | null;
  type: "PERCENT_OFF" | "FLAT_OFF" | "FREE_DELIVERY";
  percentBps: number | null;
  flatOffCents: number | null;
  minOrderCents: number;
  heroImageUrl: string | null;
  bgColor: string | null;
  ctaLabel: string | null;
  endsAt: string | null;
};

function dealValueLabel(d: PublicDeal): string {
  if (d.type === "PERCENT_OFF") return `${((d.percentBps ?? 0) / 100).toFixed(0)}% OFF`;
  if (d.type === "FLAT_OFF") return `${formatMoney(d.flatOffCents ?? 0)} OFF`;
  return "FREE DELIVERY";
}

const FAV_KEY = "easymenu:fav-deals";

function useFavorites(): [Set<string>, (id: string) => void] {
  const [favs, setFavs] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = React.useCallback((id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return [favs, toggle];
}

export function DealsGrid({
  deals,
  menuHref,
}: {
  deals: PublicDeal[];
  menuHref: string;
}) {
  const [favs, toggle] = useFavorites();

  if (deals.length === 0) return null;

  return (
    <section className="container">
      <header className="mb-3 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-primary">Today's deals</p>
          <h2 className="text-h2">Grab a deal 🔥</h2>
        </div>
        <Link href={menuHref} className="text-sm font-medium text-primary hover:underline">
          Browse menu →
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {deals.map((d) => {
          const faved = favs.has(d.id);
          return (
            <article
              key={d.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary to-primary-hover"
                style={d.bgColor ? { background: d.bgColor } : undefined}
              >
                {d.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.heroImageUrl}
                    alt={d.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary-foreground">
                    <Flame className="h-10 w-10 opacity-80" />
                  </div>
                )}
                <button
                  type="button"
                  aria-label={faved ? "Remove favorite" : "Add favorite"}
                  aria-pressed={faved}
                  onClick={() => toggle(d.id)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground-muted shadow-sm transition-all hover:scale-110 hover:text-danger"
                >
                  <Heart
                    className={`h-4 w-4 ${faved ? "fill-danger text-danger" : ""}`}
                  />
                </button>
                <Badge
                  variant="primary"
                  className="absolute left-2 top-2 bg-primary text-primary-foreground shadow-sm"
                >
                  <Flame className="mr-0.5 h-3 w-3" />
                  {dealValueLabel(d)}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-1 text-sm font-bold leading-tight">{d.title}</p>
                {d.subtitle ? (
                  <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">{d.subtitle}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground-muted">
                    {d.minOrderCents > 0 ? `Min ${formatMoney(d.minOrderCents)}` : "No min"}
                  </span>
                </div>
                <Link
                  href={menuHref}
                  className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary-hover hover:shadow-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {d.ctaLabel ?? "Order now"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
