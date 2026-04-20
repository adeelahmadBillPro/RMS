import { prisma } from "@/lib/db/client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container space-y-6 py-6">
      <div>
        <p className="font-mono text-xs text-foreground-muted">PLATFORM</p>
        <h1 className="mt-1 text-h1">Tenants</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All tenants</CardTitle>
          <CardDescription>{tenants.length} workspace(s)</CardDescription>
        </CardHeader>

        {tenants.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No tenants yet"
            description="Tenants appear here as soon as a restaurant owner finishes onboarding."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Slug</th>
                  <th className="px-4 py-2 text-left font-medium">Plan</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Members</th>
                  <th className="px-4 py-2 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-border transition-colors hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                      /{t.slug}
                    </td>
                    <td className="px-4 py-3">{t.subscription?.plan?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          t.subscription?.status === "ACTIVE"
                            ? "success"
                            : t.subscription?.status === "TRIALING"
                              ? "info"
                              : t.subscription?.status === "SUSPENDED"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {t.subscription?.status ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {t._count.memberships}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted">
                      {t.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
