"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChefHat, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRealtimeSubscription, isRealtimeConfigured } from "@/lib/realtime/client";
import { tenantChannel } from "@/lib/realtime";
import { updateOrderStatusAction } from "@/server/actions/order.actions";
import { ageMinutes, ageBucket } from "@/components/orders/order-card";

type KDSItem = {
  id: string;
  qty: number;
  itemName: string;
  variantName: string;
  notes: string | null;
  modifiers: string[];
};

type KDSOrder = {
  id: string;
  orderNumber: number;
  status: "NEW" | "PREPARING";
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "WHATSAPP";
  tableLabel: string | null;
  notes: string | null;
  createdAt: string;
  items: KDSItem[];
};

export function KDSBoard({
  slug,
  tenantId,
  orders,
}: {
  slug: string;
  tenantId: string;
  orders: KDSOrder[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const onEvent = React.useCallback(() => router.refresh(), [router]);
  useRealtimeSubscription(tenantChannel(tenantId), onEvent);
  React.useEffect(() => {
    if (isRealtimeConfigured()) return;
    const id = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(id);
  }, [router]);

  // Tick age clocks every 30s
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(() => force(), 30_000);
    return () => clearInterval(id);
  }, []);

  async function move(orderId: string, toStatus: "PREPARING" | "READY") {
    const res = await updateOrderStatusAction(slug, { orderId, toStatus });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t update", description: res.error });
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-3">
        <Link href={`/${slug}`} className="flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="flex items-center gap-2 text-sm font-medium">
          <ChefHat className="h-4 w-4 text-primary" /> Kitchen display
        </h1>
        <span className="font-mono text-xs text-foreground-muted">
          {orders.length} active
        </span>
      </header>

      <div className="flex-1 overflow-auto p-3">
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-foreground-muted">
            <div className="text-center">
              <ChefHat className="mx-auto h-12 w-12 text-foreground-subtle" />
              <p className="mt-3 text-lg">All caught up.</p>
              <p className="text-sm">New orders will appear here automatically.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((o) => {
              const bucket = ageBucket(o.createdAt);
              const colors =
                bucket === "cold"
                  ? "border-danger"
                  : bucket === "warm"
                    ? "border-warning"
                    : "border-success";
              return (
                <article
                  key={o.id}
                  className={`flex flex-col rounded-xl border-2 bg-background p-3 ${colors}`}
                >
                  <header className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <p className="font-mono text-lg font-semibold">
                        #{o.orderNumber.toString().padStart(4, "0")}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {o.channel}{o.tableLabel ? ` · ${o.tableLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={o.status === "NEW" ? "info" : "warning"}>
                        {o.status}
                      </Badge>
                      <span className="flex items-center gap-1 font-mono text-sm">
                        <Clock className="h-3 w-3" />
                        {ageMinutes(o.createdAt)}m
                      </span>
                    </div>
                  </header>
                  <ul className="my-3 flex-1 space-y-2 text-sm">
                    {o.items.map((it) => (
                      <li key={it.id}>
                        <p className="font-medium">
                          <span className="font-mono text-base">{it.qty}×</span>{" "}
                          {it.itemName}{" "}
                          <span className="text-foreground-muted">· {it.variantName}</span>
                        </p>
                        {it.modifiers.length > 0 ? (
                          <p className="ml-4 text-xs text-foreground-muted">
                            + {it.modifiers.join(", ")}
                          </p>
                        ) : null}
                        {it.notes ? (
                          <p className="ml-4 text-xs italic text-warning">“{it.notes}”</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {o.notes ? (
                    <p className="mb-2 rounded-md bg-warning-subtle p-2 text-xs italic text-warning">
                      Note: {o.notes}
                    </p>
                  ) : null}
                  <footer className="flex gap-2 border-t border-border pt-2">
                    {o.status === "NEW" ? (
                      <Button size="sm" className="flex-1" onClick={() => move(o.id, "PREPARING")}>
                        Start preparing
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1" onClick={() => move(o.id, "READY")}>
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </Button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
