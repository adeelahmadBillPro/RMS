import Link from "next/link";
import { APP } from "@/lib/config/app";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";

// One curated hero shot — calmer than an 8-tile collage and lets the food breathe.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=1600&fit=crop&q=80";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-foreground lg:grid lg:grid-cols-[1.05fr_minmax(440px,1fr)]">
      {/* HERO — desktop: full-height left column. Mobile: 38vh top header. */}
      <aside className="relative flex h-[38vh] min-h-[260px] overflow-hidden lg:h-auto lg:min-h-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-foreground/85 via-foreground/55 to-primary/40" />

        {/* Brand mark — top-left on both layouts */}
        <Link
          href="/"
          className="absolute left-5 top-5 z-20 flex items-center gap-2 text-white drop-shadow lg:left-6 lg:top-6"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <span className="font-mono text-base font-semibold">
              {APP.name.charAt(0)}
            </span>
          </span>
          <span className="font-semibold">{APP.name}</span>
        </Link>

        {/* MOBILE tagline — visible only on mobile, sits in the hero */}
        <div className="relative z-10 mt-auto w-full px-5 pb-12 text-white lg:hidden">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">
            Your restaurant, in your pocket
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight drop-shadow-md">
            One login. <br />
            Every channel.
          </h2>
        </div>

        {/* DESKTOP marketing copy — animated rotating typewriter */}
        <div className="relative z-10 hidden h-full w-full animate-slide-in-left items-end p-10 lg:flex xl:p-14">
          <AuthMarketingPanel />
        </div>
      </aside>

      {/* FORM PANEL — desktop: right column with warm canvas. Mobile: bottom-sheet pulled up over hero. */}
      <main className="relative z-10 -mt-8 flex flex-col overflow-hidden rounded-t-3xl bg-gradient-to-br from-surface via-background to-primary-subtle/40 lg:mt-0 lg:min-h-screen lg:rounded-none">
        {/* Soft accent glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-accent/10 blur-3xl"
        />
        {/* Faint dotted grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.30]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--border-strong)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 70%)",
          }}
        />

        {/* Drag-handle hint (mobile only) — small grabber bar at the top of the sheet */}
        <div
          aria-hidden
          className="relative z-10 mx-auto mt-3 h-1.5 w-10 rounded-full bg-foreground-subtle/30 lg:hidden"
        />

        <div className="relative z-10 flex flex-1 items-start justify-center px-4 pb-6 pt-3 sm:px-6 md:p-8 lg:items-center">
          <div className="w-full max-w-lg animate-slide-in-right">{children}</div>
        </div>

        <footer
          className="relative z-10 px-6 py-4 text-center text-[11px] text-foreground-subtle"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          © {new Date().getFullYear()} {APP.legal.company} · All rights reserved
        </footer>
      </main>
    </div>
  );
}
