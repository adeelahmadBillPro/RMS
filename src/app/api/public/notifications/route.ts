import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";

/**
 * Lightweight feed of the 20 newest notifications for the current user
 * in this tenant. Visible to any authenticated member. Scoping rules:
 *   - userId=null rows are broadcast — everyone in the tenant sees them
 *   - userId=<me> rows are personal
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("tenant");
  if (!slug) return NextResponse.json({ error: "tenant required" }, { status: 400 });

  let ctx;
  try {
    ctx = await getTenantContext(slug);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const items = await prisma.notification.findMany({
    where: {
      tenantId: ctx.tenantId,
      OR: [{ userId: ctx.userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unreadCount = items.filter((n) => !n.readAt).length;

  return NextResponse.json({
    unreadCount,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
