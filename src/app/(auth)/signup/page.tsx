import Link from "next/link";
import { CreditCard, QrCode, RotateCcw, Sparkles } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Start your 14-day free trial" };

const PERKS = [
  { label: "No credit card required", icon: CreditCard },
  { label: "Live menu + QR ordering in 10 minutes", icon: QrCode },
  { label: "Cancel anytime", icon: RotateCcw },
];

export default function SignupPage() {
  return (
    <div className="bg-transparent p-1 md:rounded-3xl md:border md:border-border/80 md:bg-background md:p-8 md:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          14-day free trial
        </span>
        <h1 className="mt-3 text-h1">Let&rsquo;s get you cooking</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Create your workspace — invite your staff next.
        </p>
      </div>

      <ul className="mb-5 flex flex-wrap gap-x-2 gap-y-1.5 text-[11px]">
        {PERKS.map((p) => (
          <li
            key={p.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-success"
          >
            <p.icon className="h-3 w-3" />
            {p.label}
          </li>
        ))}
      </ul>

      <SignupForm />

      <div className="mt-6 border-t border-border/70 pt-4 text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
