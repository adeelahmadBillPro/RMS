import Link from "next/link";
import { CreditCard } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Badge } from "@/components/ui/badge";
import { AdminBillingList } from "@/components/billing/admin-billing-list";

export const dynamic = "force-dynamic";

function formatPkr(paisa: number): string {
  return `Rs ${Math.round(paisa / 100).toLocaleString("en-PK")}`;
}

export default async function AdminBillingPage() {
  const invoices = await prisma.planInvoice.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const tenantIds = Array.from(new Set(invoices.map((i) => i.tenantId)));
  const tenants =
    tenantIds.length > 0
      ? await prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const pending = invoices.filter((i) => i.status === "PENDING");
  const rest = invoices.filter((i) => i.status !== "PENDING");

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">BILLING</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <CreditCard className="h-6 w-6 text-primary" />
          Plan payments
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {pending.length} pending verification · {invoices.length} total.
        </p>
      </header>

      <section className="rounded-2xl border-2 border-warning/50 bg-warning-subtle/30">
        <header className="border-b border-warning/40 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Badge variant="warning">Pending</Badge>
            Awaiting verification
          </h2>
        </header>
        {pending.length === 0 ? (
          <p className="p-6 text-center text-sm text-foreground-muted">
            Nothing waiting. 🎉
          </p>
        ) : (
          <AdminBillingList
            invoices={pending.map((i) => ({
              id: i.id,
              tenantName: tenantMap.get(i.tenantId)?.name ?? i.tenantId,
              tenantSlug: tenantMap.get(i.tenantId)?.slug ?? "",
              planCode: i.planCode,
              amountLabel: formatPkr(i.amountCents),
              method: i.method,
              reference: i.reference,
              screenshotUrl: i.screenshotUrl,
              notes: i.notes,
              status: i.status,
              createdAt: i.createdAt.toISOString(),
            }))}
          />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-background">
        <header className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Past invoices</h2>
        </header>
        {rest.length === 0 ? (
          <p className="p-6 text-center text-sm text-foreground-muted">
            No processed invoices yet.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rest.map((i) => {
              const t = tenantMap.get(i.tenantId);
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    {t ? (
                      <Link
                        href={`/super-admin/tenants`}
                        className="font-semibold hover:underline"
                      >
                        {t.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Unknown tenant</span>
                    )}
                    <p className="text-xs text-foreground-muted">
                      {new Date(i.createdAt).toLocaleString()} · {i.planCode.toUpperCase()}
                      {i.reference ? ` · ref ${i.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{formatPkr(i.amountCents)}</span>
                    <Badge
                      variant={
                        i.status === "PAID" ? "success" :
                        i.status === "FAILED" ? "danger" :
                        "neutral"
                      }
                    >
                      {i.status}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
