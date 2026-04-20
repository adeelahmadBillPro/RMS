import Link from "next/link";
import { ChefHat, Clock, ShieldCheck, Star, Utensils } from "lucide-react";
import { APP } from "@/lib/config/app";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&h=1800&fit=crop";

const HIGHLIGHTS = [
  { icon: Utensils, label: "Menu live in 10 minutes" },
  { icon: Clock, label: "Real-time order board + KDS" },
  { icon: ShieldCheck, label: "Multi-tenant, secure by default" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT — branded food hero (desktop only) */}
      <aside className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Warm orange-ish tint over the photo for brand feel */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/10 to-foreground/80"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative flex h-full flex-col p-10 text-white">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
              <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
            </span>
            <span className="drop-shadow">{APP.name}</span>
          </Link>

          <div className="mt-auto max-w-md animate-fade-in space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
              <Star className="h-3 w-3 fill-white" />
              Built for restaurants · cafes · fast food · bakeries
            </div>
            <h2 className="text-3xl font-semibold leading-tight drop-shadow md:text-4xl">
              Run your restaurant from{" "}
              <span className="whitespace-nowrap underline decoration-primary decoration-4 underline-offset-4">
                one calm, fast
              </span>{" "}
              workspace.
            </h2>
            <p className="text-sm text-white/80">
              POS, KDS, inventory, recipes, delivery &amp; WhatsApp — one login.
              Your customers get a branded ordering site with live order tracking.
            </p>
            <ul className="space-y-2.5">
              {HIGHLIGHTS.map((h) => (
                <li key={h.label} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <h.icon className="h-3.5 w-3.5" />
                  </span>
                  {h.label}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 text-xs text-white/60">
            © {new Date().getFullYear()} {APP.legal.company}. All rights reserved.
          </p>
        </div>
      </aside>

      {/* RIGHT — form (full-width on mobile, half on desktop) */}
      <main className="relative flex min-h-screen flex-col bg-surface lg:min-h-0">
        {/* Mobile hero strip */}
        <div className="relative h-40 overflow-hidden lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-foreground/10 to-surface" />
          <div className="relative flex h-full items-end p-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white drop-shadow">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
              </span>
              {APP.name}
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-sm animate-slide-up">
            {/* Desktop brand (mirrors the mobile strip, simpler) */}
            <Link
              href="/"
              className="mb-8 hidden items-center gap-2 text-sm font-semibold text-foreground-muted hover:text-foreground lg:inline-flex"
            >
              <ChefHat className="h-4 w-4 text-primary" />
              Back to home
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
