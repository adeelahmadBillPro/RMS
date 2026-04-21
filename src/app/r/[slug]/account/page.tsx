import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Package, User } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerAccountPage({ params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!tenant) notFound();

  const session = await getSession();
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/r/${params.slug}/account`)}`);
  }

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      customerUserId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      channel: true,
      createdAt: true,
    },
  });

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">MY ACCOUNT · {tenant.name.toUpperCase()}</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <User className="h-6 w-6 text-primary" />
          Hello, {session.user.name ?? session.user.email}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">{session.user.email}</p>
      </header>

      <section className="rounded-2xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-primary" /> Your orders
          </h2>
          <span className="text-xs text-foreground-muted">{orders.length} recent</span>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-foreground-muted">No orders yet.</p>
            <Link
              href={`/r/${params.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Browse menu <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="p-4 hover:bg-surface/50">
                <Link
                  href={`/r/${params.slug}/order/${o.id}`}
                  className="flex items-start gap-3"
                  aria-label={`Track order ${o.orderNumber}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold">
                        #{o.orderNumber.toString().padStart(4, "0")}
                      </p>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium uppercase text-foreground-muted">
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {o.channel.replace("_", " ")} · {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-semibold">{formatMoney(o.totalCents)}</span>
                    <ChevronRight className="h-4 w-4 text-foreground-subtle" />
                  </div>
                </Link>
                <div className="mt-2 flex gap-3 pl-0">
                  <Link
                    href={`/r/${params.slug}/receipt/${o.id}`}
                    className="text-xs font-medium text-foreground-muted hover:text-primary hover:underline"
                  >
                    Receipt
                  </Link>
                  <Link
                    href={`/r/${params.slug}/order/${o.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Track order →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
