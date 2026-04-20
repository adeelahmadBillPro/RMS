"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit/log";
import { getTenantContext } from "@/lib/tenant/context";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import {
  closeThreadSchema,
  markReadSchema,
  seedInboundSchema,
  sendMessageSchema,
  toggleWhatsAppSchema,
} from "@/lib/validations/whatsapp.schema";
import type { ActionResult } from "./auth.actions";

function fieldErrors(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = i.path.join(".") || "_form";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
function canManage(role: string) {
  return role === "OWNER" || role === "MANAGER";
}

/** Manager sends an outbound WhatsApp reply. */
export async function sendWhatsAppMessageAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ messageId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role))
    return { ok: false, error: "Only owners and managers can send messages." };
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { whatsappEnabled: true },
  });
  if (!tenant?.whatsappEnabled)
    return { ok: false, error: "WhatsApp is disabled for this tenant. Enable it in Settings." };

  const thread = await prisma.whatsAppThread.findFirst({
    where: { id: parsed.data.threadId, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!thread) return { ok: false, error: "Thread not found." };

  const provider = getWhatsAppProvider();
  const result = await provider.sendMessage({
    toPhone: thread.customerPhone,
    body: parsed.data.body,
  });

  const message = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const m = await tx.whatsAppMessage.create({
      data: {
        threadId: thread.id,
        direction: "OUTBOUND",
        body: parsed.data.body,
        status: "SENT",
        providerMessageId: result.messageId,
        sentByUserId: ctx.userId,
      },
    });
    await tx.whatsAppThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: now, status: "OPEN" },
    });
    return m;
  });

  await audit({
    action: "WHATSAPP_MESSAGE_SENT",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { threadId: thread.id, messageId: message.id, provider: provider.name },
  });
  revalidatePath(`/${slug}/whatsapp`);
  return { ok: true, data: { messageId: message.id } };
}

export async function markThreadReadAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const thread = await prisma.whatsAppThread.findFirst({
    where: { id: parsed.data.threadId, tenantId: ctx.tenantId },
  });
  if (!thread) return { ok: false, error: "Thread not found." };
  await prisma.$transaction(async (tx) => {
    await tx.whatsAppThread.update({ where: { id: thread.id }, data: { unreadCount: 0 } });
    await tx.whatsAppMessage.updateMany({
      where: { threadId: thread.id, direction: "INBOUND", readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });
  });
  revalidatePath(`/${slug}/whatsapp`);
  return { ok: true, data: null };
}

export async function closeThreadAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const parsed = closeThreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const thread = await prisma.whatsAppThread.findFirst({
    where: { id: parsed.data.threadId, tenantId: ctx.tenantId },
  });
  if (!thread) return { ok: false, error: "Thread not found." };
  await prisma.whatsAppThread.update({
    where: { id: thread.id },
    data: { status: "CLOSED" },
  });
  await audit({
    action: "WHATSAPP_THREAD_CLOSED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { threadId: thread.id },
  });
  revalidatePath(`/${slug}/whatsapp`);
  return { ok: true, data: null };
}

/**
 * Dev helper: simulate an inbound message without hitting the webhook.
 * Only available when the provider is mock OR WHATSAPP_ENABLED is false
 * (we don't want to let managers synthesize "real" customer messages in prod).
 */
export async function seedInboundMessageAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ threadId: string; messageId: string }>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };

  const isMockProvider = (process.env.WHATSAPP_PROVIDER ?? "mock") === "mock";
  if (!isMockProvider)
    return { ok: false, error: "Demo messages are only allowed when using the mock provider." };

  const parsed = seedInboundSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };

  const thread = await prisma.$transaction(async (tx) => {
    const t = await tx.whatsAppThread.upsert({
      where: {
        tenantId_customerPhone: { tenantId: ctx.tenantId, customerPhone: parsed.data.customerPhone },
      },
      update: {
        customerName: parsed.data.customerName || undefined,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        status: "OPEN",
      },
      create: {
        tenantId: ctx.tenantId,
        customerPhone: parsed.data.customerPhone,
        customerName: parsed.data.customerName || null,
        lastMessageAt: new Date(),
        unreadCount: 1,
      },
    });
    const m = await tx.whatsAppMessage.create({
      data: {
        threadId: t.id,
        direction: "INBOUND",
        body: parsed.data.body,
        status: "DELIVERED",
      },
    });
    return { t, m };
  });

  revalidatePath(`/${slug}/whatsapp`);
  return { ok: true, data: { threadId: thread.t.id, messageId: thread.m.id } };
}

export async function toggleWhatsAppAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<{ enabled: boolean }>> {
  const ctx = await getTenantContext(slug);
  if (ctx.membership.role !== "OWNER")
    return { ok: false, error: "Only owners can change the WhatsApp setting." };
  const parsed = toggleWhatsAppSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      whatsappEnabled: parsed.data.enabled,
      whatsappNumber: parsed.data.whatsappNumber || null,
    },
  });
  await audit({
    action: "SETTINGS_UPDATED",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { whatsappEnabled: parsed.data.enabled },
  });
  revalidatePath(`/${slug}/whatsapp`);
  revalidatePath(`/${slug}/settings`);
  return { ok: true, data: { enabled: parsed.data.enabled } };
}

/** Convert a thread into an Order using the POS channel=WHATSAPP. */
export async function linkThreadToOrderAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const ctx = await getTenantContext(slug);
  if (!canManage(ctx.membership.role)) return { ok: false, error: "Forbidden." };
  const schema = Prisma.validator<Prisma.WhatsAppThreadWhereInput>();
  void schema;
  const data = input as { threadId?: string; orderId?: string };
  if (!data.threadId || !data.orderId) return { ok: false, error: "Invalid request." };

  const [thread, order] = await Promise.all([
    prisma.whatsAppThread.findFirst({
      where: { id: data.threadId, tenantId: ctx.tenantId },
    }),
    prisma.order.findFirst({
      where: { id: data.orderId, tenantId: ctx.tenantId },
    }),
  ]);
  if (!thread) return { ok: false, error: "Thread not found." };
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.whatsAppThread.update({
    where: { id: thread.id },
    data: { convertedOrderId: order.id },
  });
  await audit({
    action: "WHATSAPP_CONVERTED_TO_ORDER",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    metadata: { threadId: thread.id, orderId: order.id },
  });
  revalidatePath(`/${slug}/whatsapp`);
  return { ok: true, data: null };
}
