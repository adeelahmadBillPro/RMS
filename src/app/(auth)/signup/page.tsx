import Link from "next/link";
import { Check } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Start your 14-day free trial" };

const PERKS = [
  "No credit card required",
  "Live menu + QR ordering in 10 minutes",
  "Cancel anytime",
];

export default function SignupPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-h1">Let’s get you cooking 🍔</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Create your workspace — you can invite your staff next.
        </p>
      </header>
      <ul className="mb-6 space-y-1.5 text-xs">
        {PERKS.map((p) => (
          <li key={p} className="flex items-center gap-2 text-foreground-muted">
            <Check className="h-3.5 w-3.5 text-success" />
            {p}
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
