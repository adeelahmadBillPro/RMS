import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your inbox</CardTitle>
        <CardDescription>
          Email verification ships with the email-delivery wiring in Phase 2.
        </CardDescription>
      </CardHeader>
      <Badge variant="info">Phase 2</Badge>
    </Card>
  );
}
