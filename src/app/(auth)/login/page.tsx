import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="bg-transparent p-1 md:rounded-3xl md:border md:border-border/80 md:bg-background md:p-9 md:shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3 w-3" />
          Restaurant owner sign-in
        </span>
        <h1 className="mt-3 text-h1">Welcome back</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Sign in to manage your restaurant.
        </p>
      </div>

      <LoginForm />

      <div className="mt-7 border-t border-border/70 pt-5 text-center text-sm text-foreground-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Start free trial
        </Link>
      </div>
    </div>
  );
}
