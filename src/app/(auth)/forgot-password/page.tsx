import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          We’ll wire this up in Phase 2 alongside email delivery. For now, contact support.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4">
        <Badge variant="info">Coming in Phase 2</Badge>
        <p className="text-sm text-foreground-muted">
          Email-based password reset and OTP staff login arrive with the auth hardening pass.
        </p>
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </Card>
  );
}
