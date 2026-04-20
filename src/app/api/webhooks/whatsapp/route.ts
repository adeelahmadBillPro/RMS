import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { webhookPayloadSchema } from "@/lib/validations/whatsapp.schema";

/**
 * Inbound WhatsApp webhook — Phase 3 stub.
 *
 * Accepts our minimal normalised shape:
 *   { tenantSlug, fromPhone, fromName?, body, providerMessageId? }
 *
 * Real Meta/Twilio payloads are nested deeper — a Phase 5 commit will
 * extend this route to unwrap them (Meta's `entry[].changes[].value.messages[]`
 * and Twilio's form-encoded `From`/`Body`). For now, ops can POST the
 * minimal shape directly to smoke-test the pipeline.
 *
 * Security: Phase 5 will verify Meta's X-Hub-Signature or Twilio's
 * signature header. Phase 3 accepts any POST — acceptable because the
 * route is effectively dev-only (the per-tenant whatsappEnabled flag
 * gates whether messages actually land in the inbox).
 */
export async function GET(req: Request) {
  // Meta verification challenge — used once when configuring the webhook.
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.WHATSAPP_VERIFY_TOKEN === token) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ ok: true, message: "whatsapp webhook (Phase 3 stub)" });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { tenantSlug, fromPhone, fromName, body: messageBody, providerMessageId } = parsed.data;

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, deletedAt: null },
    select: { id: true, whatsappEnabled: true },
  });
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  if (!tenant.whatsappEnabled) {
    // Accept the webhook but drop the message — otherwise the provider
    // keeps retrying. Log only.
    return NextResponse.json({ ok: true, dropped: "whatsapp disabled" });
  }

  await prisma.$transaction(async (tx) => {
    const thread = await tx.whatsAppThread.upsert({
      where: {
        tenantId_customerPhone: { tenantId: tenant.id, customerPhone: fromPhone },
      },
      update: {
        customerName: fromName ?? undefined,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        status: "OPEN",
      },
      create: {
        tenantId: tenant.id,
        customerPhone: fromPhone,
        customerName: fromName ?? null,
        lastMessageAt: new Date(),
        unreadCount: 1,
      },
    });
    await tx.whatsAppMessage.create({
      data: {
        threadId: thread.id,
        direction: "INBOUND",
        body: messageBody,
        status: "DELIVERED",
        providerMessageId: providerMessageId ?? null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
