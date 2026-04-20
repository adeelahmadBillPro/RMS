"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useRealtimeSubscription, isRealtimeConfigured } from "@/lib/realtime/client";
import { tenantChannel } from "@/lib/realtime";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OrderCard, type OrderListItem } from "./order-card";
import { OrderDetailPanel, type OrderDetail } from "./order-detail";

const COLUMNS: Array<{ key: OrderListItem["status"]; label: string }> = [
  { key: "NEW", label: "New" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
];

export function OrderBoard({
  slug,
  tenantId,
  canManage,
  orders,
}: {
  slug: string;
  tenantId: string;
  canManage: boolean;
  orders: (OrderListItem & { paidCents: number })[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  // Live updates: refresh on any order event from this tenant.
  const onEvent = React.useCallback(() => router.refresh(), [router]);
  useRealtimeSubscription(`tenant-${tenantId}-public`, onEvent);
  // Phase 1 also subscribes to private channel name shape — for when we
  // wire auth in Phase 5; ignored if Pusher isn't configured.
  useRealtimeSubscription(tenantChannel(tenantId), onEvent);

  // Polling fallback when Pusher isn't configured: refresh every 8s.
  React.useEffect(() => {
    if (isRealtimeConfigured()) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [router]);

  // Re-render every 30s so age clocks tick.
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(() => force(), 30_000);
    return () => clearInterval(id);
  }, []);

  async function openDetail(id: string) {
    setOpenId(id);
    setLoadingDetail(true);
    const res = await fetch(`/api/orders/${id}?tenant=${slug}`);
    if (res.ok) setDetail(await res.json());
    setLoadingDetail(false);
  }

  const byStatus = new Map<OrderListItem["status"], typeof orders>();
  for (const o of orders) {
    const arr = byStatus.get(o.status) ?? [];
    arr.push(o);
    byStatus.set(o.status, arr);
  }

  const completed = (byStatus.get("COMPLETED") ?? []).concat(byStatus.get("CANCELLED") ?? []);

  return (
    <div className="space-y-4">
      {!isRealtimeConfigured() ? (
        <p className="text-xs text-foreground-subtle">
          Live updates: <Badge variant="neutral">polling 8s</Badge> — set <code className="font-mono">PUSHER_*</code> env vars for instant push.
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = byStatus.get(col.key) ?? [];
          return (
            <div key={col.key} className="rounded-xl border border-border bg-surface p-3">
              <h3 className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {col.label}
                <Badge variant="neutral">{list.length}</Badge>
              </h3>
              <div className="space-y-2">
                {list.length === 0 ? (
                  <p className="py-6 text-center text-xs text-foreground-subtle">Empty</p>
                ) : (
                  list.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      paidCents={o.paidCents}
                      onClick={() => openDetail(o.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {completed.length > 0 ? (
        <details className="rounded-xl border border-border bg-surface p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Completed / cancelled (last 24h) <Badge variant="neutral" className="ml-2">{completed.length}</Badge>
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {completed.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                paidCents={o.paidCents}
                compact
                onClick={() => openDetail(o.id)}
              />
            ))}
          </div>
        </details>
      ) : null}

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-md">
          {loadingDetail ? (
            <p className="py-8 text-center text-sm text-foreground-muted">Loading…</p>
          ) : detail ? (
            <OrderDetailPanel
              slug={slug}
              order={detail}
              canManage={canManage}
              onClose={() => setOpenId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
