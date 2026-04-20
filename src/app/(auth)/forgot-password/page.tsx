import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <header className="mb-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-h1">Reset your password</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Email-based password reset ships with our auth hardening pass.
        </p>
      </header>
      <div className="space-y-3 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <Badge variant="info">Coming in Phase 2 hardening</Badge>
        <p className="text-sm text-foreground-muted">
          For now, ping <span className="font-medium text-foreground">support@easymenu.app</span>{" "}
          and we’ll reset your password manually within a few minutes.
        </p>
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
