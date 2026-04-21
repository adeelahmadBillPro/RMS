import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="bg-transparent p-1 md:rounded-3xl md:border md:border-border/80 md:bg-background md:p-9 md:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
          <KeyRound className="h-3 w-3" />
          Account recovery
        </span>
        <h1 className="mt-3 text-h1">Forgot your password?</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Enter the email you signed up with and we&rsquo;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="mt-7 border-t border-border/70 pt-5 text-center text-sm text-foreground-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
