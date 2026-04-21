"use client";

import * as React from "react";
import { Clock, ShieldCheck, Sparkles, Utensils } from "lucide-react";

const ROTATING_PHRASES = [
  "from one calm workspace.",
  "without juggling 5 apps.",
  "with real-time orders.",
  "and delight every guest.",
];

const HIGHLIGHTS = [
  { icon: Utensils, label: "Menu live in 10 minutes" },
  { icon: Clock, label: "Real-time order board + KDS" },
  { icon: ShieldCheck, label: "Multi-tenant, secure by default" },
];

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 1600;

function useTypewriter(phrases: string[]) {
  const [text, setText] = React.useState("");
  const [phraseIndex, setPhraseIndex] = React.useState(0);
  const [mode, setMode] = React.useState<"typing" | "holding" | "erasing">("typing");

  React.useEffect(() => {
    const current = phrases[phraseIndex] ?? "";
    let timer: number | undefined;

    if (mode === "typing") {
      if (text.length < current.length) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), TYPE_MS);
      } else {
        timer = window.setTimeout(() => setMode("erasing"), HOLD_MS);
      }
    } else if (mode === "erasing") {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length - 1)), ERASE_MS);
      } else {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setMode("typing");
      }
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [text, mode, phraseIndex, phrases]);

  return text;
}

export function AuthMarketingPanel() {
  const typed = useTypewriter(ROTATING_PHRASES);

  return (
    <div className="text-white">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
        <Sparkles className="h-3.5 w-3.5 text-primary-subtle" />
        Built for restaurants, cafes &amp; bakeries
      </span>

      <h1 className="mt-5 text-4xl font-bold leading-tight drop-shadow-md xl:text-5xl">
        Run your restaurant
        <br />
        <span className="inline-flex min-h-[1.2em] items-baseline">
          <span className="bg-gradient-to-r from-white via-primary-subtle to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
            {typed}
          </span>
          <span
            aria-hidden
            className="ml-[3px] inline-block h-[0.85em] w-[3px] translate-y-[2px] rounded-sm bg-primary-subtle animate-caret"
          />
        </span>
      </h1>

      <p className="mt-4 max-w-md text-sm text-white/85 drop-shadow">
        POS, KDS, inventory, recipes, delivery &amp; WhatsApp — one login. Your
        customers get a branded ordering site with live order tracking.
      </p>

      <ul className="mt-7 space-y-2.5">
        {HIGHLIGHTS.map((h, i) => (
          <li
            key={h.label}
            className="flex items-center gap-2.5 text-sm opacity-0 animate-slide-up"
            style={{
              animationDelay: `${180 + i * 120}ms`,
              animationFillMode: "forwards",
            }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/20">
              <h.icon className="h-3.5 w-3.5" />
            </span>
            {h.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
