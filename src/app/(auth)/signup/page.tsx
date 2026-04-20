import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start your 14-day free trial</CardTitle>
        <CardDescription>No credit card required.</CardDescription>
      </CardHeader>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
