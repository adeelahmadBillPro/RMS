import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WhatsAppInbox } from "@/components/whatsapp/inbox";
import { FEATURES } from "@/lib/config/app";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { whatsappEnabled: true, whatsappNumber: true, name: true },
  });
  if (!tenant) notFound();

  const canManage = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";
  const isOwner = ctx.membership.role === "OWNER";
  const mockMode = (process.env.WHATSAPP_PROVIDER ?? "mock") === "mock";

  if (!tenant.whatsappEnabled) {
    return (
      <div className="container max-w-2xl space-y-4 py-6">
        <header>
          <p className="font-mono text-xs text-foreground-muted">INTEGRATIONS</p>
          <h1 className="mt-1 text-h1">WhatsApp inbox</h1>
        </header>
        <Card>
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="WhatsApp integration is off"
            description={
              isOwner
                ? "Turn it on to route WhatsApp orders into this panel. You choose the provider (official Meta, Twilio, or scan-your-own via Baileys)."
                : "Ask your owner to enable it under Settings."
            }
            action={
              isOwner ? (
                <Button asChild>
                  <Link href={`/${params.tenantSlug}/settings`}>Open settings</Link>
                </Button>
              ) : null
            }
          />
        </Card>
      </div>
    );
  }

  const threads = await prisma.whatsAppThread.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
    take: 100,
  });

  return (
    <div className="container space-y-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-foreground-muted">INTEGRATIONS</p>
          <h1 className="mt-1 text-h1">WhatsApp inbox</h1>
          {tenant.whatsappNumber ? (
            <p className="mt-0.5 font-mono text-xs text-foreground-muted">
              {tenant.whatsappNumber}
            </p>
          ) : null}
        </div>
        {mockMode ? (
          <div className="rounded-md border border-info bg-info-subtle px-3 py-1.5 text-xs text-info">
            Mock provider — messages are logged to the server console, not sent via WhatsApp.
          </div>
        ) : null}
      </header>

      <WhatsAppInbox
        slug={params.tenantSlug}
        canManage={canManage}
        mockMode={mockMode || !FEATURES.whatsappEnabled}
        threads={threads.map((t) => ({
          id: t.id,
          customerPhone: t.customerPhone,
          customerName: t.customerName,
          unreadCount: t.unreadCount,
          status: t.status,
          lastMessageAt: t.lastMessageAt.toISOString(),
          convertedOrderId: t.convertedOrderId,
          messages: t.messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            status: m.status,
          })),
        }))}
      />
    </div>
  );
}
