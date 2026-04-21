"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const RULES = [
  { test: (p: string) => p.length >= 8, label: "8+ characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "Uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "Lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "Number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "Symbol" },
] as const;

type Strength = {
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
  tone: "neutral" | "danger" | "warning" | "info" | "success";
  score: number; // 0..5
};

function scorePassword(pw: string): Strength {
  if (!pw) return { label: "Empty", tone: "neutral", score: 0 };
  const passed = RULES.reduce((n, r) => n + (r.test(pw) ? 1 : 0), 0);
  const lengthBonus = pw.length >= 12 ? 1 : 0;
  const total = Math.min(5, passed + lengthBonus);
  if (total <= 2) return { label: "Weak", tone: "danger", score: total };
  if (total === 3) return { label: "Fair", tone: "warning", score: total };
  if (total === 4) return { label: "Good", tone: "info", score: total };
  return { label: "Strong", tone: "success", score: total };
}

const TONE_BAR: Record<Strength["tone"], string> = {
  neutral: "bg-border",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
};
const TONE_TEXT: Record<Strength["tone"], string> = {
  neutral: "text-foreground-subtle",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

export function PasswordStrengthMeter({ password = "" }: { password?: string }) {
  const strength = React.useMemo(() => scorePassword(password), [password]);
  const segments = 5;
  const filled = strength.score;

  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={segments}
        aria-valuenow={filled}
        aria-valuetext={strength.label}
        className="flex items-center gap-1.5"
      >
        <div className="flex flex-1 gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < filled ? TONE_BAR[strength.tone] : "bg-border",
              )}
            />
          ))}
        </div>
        <span className={cn("text-[11px] font-medium", TONE_TEXT[strength.tone])} aria-hidden>
          {strength.label}
        </span>
      </div>

      {password ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {RULES.map((r) => {
            const ok = r.test(password);
            return (
              <li
                key={r.label}
                className={cn(
                  "flex items-center gap-1.5",
                  ok ? "text-success" : "text-foreground-subtle",
                )}
              >
                {ok ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {r.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
