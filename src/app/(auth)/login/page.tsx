import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your dashboard.</CardDescription>
      </CardHeader>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Don’t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Start free trial
        </Link>
      </p>
    </Card>
  );
}
