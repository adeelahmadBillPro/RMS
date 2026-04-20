import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  const session = await requireSession();
  // Already onboarded? Send straight to their tenant.
  if (session.user.memberships.length > 0) {
    const m = session.user.memberships[0];
    if (m) redirect(`/${m.tenantSlug}`);
  }
  return (
    <div className="container mx-auto max-w-2xl py-12">
      <header className="mb-8">
        <p className="font-mono text-xs text-foreground-muted">SETUP</p>
        <h1 className="mt-1 text-h1">Tell us about your restaurant</h1>
        <p className="mt-2 text-body text-foreground-muted">
          Five quick steps. You can change everything later in settings.
        </p>
      </header>
      <OnboardingWizard />
    </div>
  );
}
