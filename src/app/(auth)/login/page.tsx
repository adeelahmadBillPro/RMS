import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-h1">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Sign in to manage your restaurant.
        </p>
      </header>
      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Don’t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Start free trial
        </Link>
      </p>
    </div>
  );
}
