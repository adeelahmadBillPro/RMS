import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = (searchParams.token ?? "").trim();

  if (!token) {
    return (
      <div className="bg-transparent p-1 md:rounded-3xl md:border md:border-border/80 md:bg-background md:p-9 md:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
        <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-warning-subtle text-warning">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h1 className="text-h1">Reset link missing</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          The reset link looks incomplete. Request a fresh one and try again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
          <Link href="/login" className="text-foreground-muted hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent p-1 md:rounded-3xl md:border md:border-border/80 md:bg-background md:p-9 md:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3 w-3" />
          Choose a new password
        </span>
        <h1 className="mt-3 text-h1">Set a new password</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Pick something strong — 8+ characters with a mix of letters, numbers, and a symbol.
        </p>
      </div>

      <ResetPasswordForm token={token} />

      <div className="mt-7 border-t border-border/70 pt-5 text-center text-sm text-foreground-muted">
        Changed your mind?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
