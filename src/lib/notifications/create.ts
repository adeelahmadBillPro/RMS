import type { NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { realtime, tenantChannel } from "@/lib/realtime";

type Tx = Prisma.TransactionClient | PrismaClient | typeof prisma;

export async function notify(
  args: {
    tenantId: string;
    userId?: string | null;
    type: NotificationType;
    title: string;
    body?: string;
    href?: string;
    metadata?: Prisma.InputJsonValue;
  },
  tx?: Tx,
) {
  const client = tx ?? prisma;
  const n = await client.notification.create({
    data: {
      tenantId: args.tenantId,
      userId: args.userId ?? null,
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      href: args.href ?? null,
      metadata: args.metadata,
    },
  });
  // Fire realtime so the bell updates instantly
  await realtime.trigger(tenantChannel(args.tenantId), "notification.created", {
    id: n.id,
    type: n.type,
    title: n.title,
  });
  return n;
}
