import Link from "next/link";
import { Clock, ShieldCheck, Sparkles, Star, Utensils } from "lucide-react";
import { APP } from "@/lib/config/app";

// Multiple food photos tiled around the form for that real food-app feel.
const BACKDROP_TILES = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop", // zinger burger
  "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=600&fit=crop", // beef burger
  "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop", // fries
  "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&h=600&fit=crop", // shawarma
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=600&fit=crop", // pizza
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=600&fit=crop", // pizza slice
  "https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=600&h=600&fit=crop", // coke
  "https://images.unsplash.com/photo-1612392166886-ee72c97bafd7?w=600&h=600&fit=crop", // fried chicken
];

const HIGHLIGHTS = [
  { icon: Utensils, label: "Menu live in 10 minutes" },
  { icon: Clock, label: "Real-time order board + KDS" },
  { icon: ShieldCheck, label: "Multi-tenant, secure by default" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-foreground">
      {/* Full-bleed food collage backdrop */}
      <div aria-hidden className="absolute inset-0">
        <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-0.5 opacity-90">
          {BACKDROP_TILES.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        {/* Warm orange tint + dark vignette so the form is readable on top */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-foreground/70 to-foreground/90" />
        <div className="pointer-events-none absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/30 blur-3xl" />
      </div>

      {/* Brand mark top-left */}
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2 text-white drop-shadow"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
          <span className="font-mono text-base font-semibold">{APP.name.charAt(0)}</span>
        </span>
        <span className="font-semibold">{APP.name}</span>
      </Link>

      {/* Legend top-right (desktop only) */}
      <div className="absolute right-6 top-6 z-20 hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white backdrop-blur md:flex">
        <Star className="h-3 w-3 fill-white" />
        Built for restaurants, cafes, fast food, bakeries
      </div>

      {/* Centered form card */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-4 py-16 md:py-10">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_auto]">
          {/* Marketing column (desktop only) */}
          <aside className="hidden self-center pr-6 text-white lg:block">
            <Sparkles className="h-8 w-8 text-primary-foreground drop-shadow" />
            <h1 className="mt-4 text-5xl font-bold leading-tight drop-shadow">
              Run your restaurant <br />
              <span className="bg-gradient-to-r from-white to-primary-subtle bg-clip-text text-transparent">
                from one calm workspace.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/90 drop-shadow">
              POS, KDS, inventory, recipes, delivery &amp; WhatsApp — one login.
              Your customers get a branded ordering site with live order tracking.
            </p>
            <ul className="mt-6 space-y-2.5">
              {HIGHLIGHTS.map((h) => (
                <li key={h.label} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <h.icon className="h-3.5 w-3.5" />
                  </span>
                  {h.label}
                </li>
              ))}
            </ul>
          </aside>

          {/* Form card — glass-morphism on top of food backdrop */}
          <div className="w-full max-w-md animate-slide-up justify-self-center lg:justify-self-end">
            <div className="rounded-3xl border border-white/20 bg-background/95 p-6 shadow-2xl backdrop-blur-xl md:p-8">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Footer band */}
      <footer className="absolute inset-x-0 bottom-0 z-10 px-6 py-4 text-center text-[11px] text-white/70">
        © {new Date().getFullYear()} {APP.legal.company} · All rights reserved
      </footer>
    </div>
  );
}
