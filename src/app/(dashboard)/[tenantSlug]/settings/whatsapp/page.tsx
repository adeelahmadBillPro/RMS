import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppSettingsForm } from "@/components/whatsapp/settings-form";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage({
  params,
}: {
  params: { tenantSlug: string };
}) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { whatsappEnabled: true, whatsappNumber: true },
  });
  if (!tenant) notFound();

  const provider = process.env.WHATSAPP_PROVIDER ?? "mock";
  const providerEnvEnabled = process.env.WHATSAPP_ENABLED === "true";

  return (
    <div className="space-y-4">
      <Card>
        <header className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            <MessagesSquare className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-h3">WhatsApp integration</h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Route WhatsApp orders straight into your panel.
            </p>
          </div>
        </header>

        <div className="mb-4 grid gap-2 rounded-lg border border-border bg-surface-muted/50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">Provider</span>
            <Badge variant={provider === "mock" ? "neutral" : "info"}>{provider}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">Server env</span>
            <Badge variant={providerEnvEnabled ? "success" : "warning"}>
              WHATSAPP_ENABLED={String(providerEnvEnabled)}
            </Badge>
          </div>
          {provider === "mock" ? (
            <p className="mt-1 text-foreground-muted">
              Mock provider logs messages to the server console; no WhatsApp traffic.
              Add your Meta/Twilio creds to <code className="font-mono">.env.local</code> and
              set <code className="font-mono">WHATSAPP_PROVIDER</code> to go live.
            </p>
          ) : null}
        </div>

        <WhatsAppSettingsForm
          slug={params.tenantSlug}
          initial={{
            enabled: tenant.whatsappEnabled,
            whatsappNumber: tenant.whatsappNumber ?? "",
          }}
          canEdit={ctx.membership.role === "OWNER"}
        />

        <div className="mt-6 border-t border-border pt-4 text-xs text-foreground-muted">
          <p className="font-medium text-foreground">Options we support</p>
          <ul className="mt-2 space-y-1 pl-4 [&>li]:list-disc">
            <li>
              <span className="font-medium">Meta Cloud API</span> — official, ToS-safe.
              Requires Business Manager verification (~3–10 days).
            </li>
            <li>
              <span className="font-medium">Twilio WhatsApp API</span> — easier onboarding.
              Sandbox for testing, approved senders for production.
            </li>
            <li>
              <span className="font-medium">Baileys QR-scan</span> — scan your personal
              WhatsApp. Free, but violates WhatsApp’s ToS — account ban risk. Requires
              an always-on Node worker (not Vercel serverless). Phase 5 wiring.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
