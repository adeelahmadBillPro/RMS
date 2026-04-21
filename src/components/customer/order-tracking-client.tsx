"use client";

import * as React from "react";
import {
  Bike,
  Check,
  ChefHat,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  PartyPopper,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cancelPublicOrderAction } from "@/server/actions/public-order.actions";
import { useRealtimeSubscription, isRealtimeConfigured } from "@/lib/realtime/client";
import { tenantChannel } from "@/lib/realtime";
import { haptic } from "@/lib/ui/haptics";
import { formatMoney } from "@/lib/utils";

type TrackingOrder = {
  id: string;
  orderNumber: number;
  status: "NEW" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED";
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "WHATSAPP";
  tableLabel: string | null;
  customerName: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  etaMinutes: number;
  subtotalCents: number;
  taxCents: number;
  serviceCents: number;
  deliveryChargeCents: number;
  totalCents: number;
  tenantName: string;
  tenantSlug: string;
  items: {
    qty: number;
    itemName: string;
    variantName: string;
    modifiers: string[];
    lineTotalCents: number;
  }[];
};

const STEPS_DINE_IN = ["NEW", "PREPARING", "READY", "COMPLETED"] as const;
const STEPS_DELIVERY = ["NEW", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"] as const;
const STEPS_TAKEAWAY = ["NEW", "PREPARING", "READY", "COMPLETED"] as const;

const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  NEW: Package,
  PREPARING: ChefHat,
  READY: CheckCircle2,
  OUT_FOR_DELIVERY: Bike,
  COMPLETED: PartyPopper,
};

const STEP_LABEL: Record<string, string> = {
  NEW: "Received",
  PREPARING: "Being prepared",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On the way",
  COMPLETED: "Delivered",
};

function stepsFor(order: TrackingOrder): readonly string[] {
  if (order.channel === "DELIVERY") return STEPS_DELIVERY;
  if (order.channel === "DINE_IN") return STEPS_DINE_IN;
  return STEPS_TAKEAWAY;
}

export function OrderTrackingClient({
  slug,
  tenantId,
  initial,
}: {
  slug: string;
  tenantId: string;
  initial: TrackingOrder;
}) {
  const [order, setOrder] = React.useState<TrackingOrder>(initial);
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelPhone, setCancelPhone] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);

  // Live refresh: realtime event OR 5s poll as fallback
  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/public/order/${initial.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as TrackingOrder;
        setOrder(data);
      }
    } catch {
      /* ignore */
    }
  }, [initial.id]);

  useRealtimeSubscription(tenantChannel(tenantId), () => void refresh());

  React.useEffect(() => {
    // Stop polling once the order is in a terminal state
    if (order.status === "COMPLETED" || order.status === "CANCELLED") return;
    const every = isRealtimeConfigured() ? 30_000 : 5_000;
    const id = setInterval(refresh, every);
    return () => clearInterval(id);
  }, [order.status, refresh]);

  // Tick every 30s so the "time since" updates
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(() => force(), 30_000);
    return () => clearInterval(id);
  }, []);

  const steps = stepsFor(order);
  const stepIdx = steps.indexOf(order.status as (typeof steps)[number]);
  const isCancelled = order.status === "CANCELLED";
  const minutesSince = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000);
  const etaRemaining = Math.max(0, order.etaMinutes - minutesSince);

  if (isCancelled) {
    return (
      <div className="rounded-3xl border border-danger bg-danger-subtle p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-danger" />
        <h1 className="mt-3 text-h1">Order cancelled</h1>
        {order.cancelReason ? (
          <p className="mt-2 text-sm text-foreground-muted">“{order.cancelReason}”</p>
        ) : null}
        <OrderSummary order={order} />
      </div>
    );
  }

  const heroIcon = order.status === "COMPLETED" ? PartyPopper : STEP_ICON[order.status] ?? Package;
  const HeroIcon = heroIcon;

  return (
    <div className="space-y-5">
      {/* Big status hero */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 text-center transition-colors ${
          order.status === "COMPLETED"
            ? "border-success bg-success-subtle"
            : "border-primary bg-primary-subtle"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl"
        />
        <div className="relative">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              order.status === "COMPLETED" ? "bg-success text-white" : "bg-primary text-white"
            } animate-fade-in`}
          >
            <HeroIcon className="h-7 w-7" />
          </div>
          <p className="mt-3 font-mono text-xs text-foreground-muted">
            {order.tenantName} · Order #{order.orderNumber.toString().padStart(4, "0")}
          </p>
          <h1 className="mt-1 text-h1">
            {order.status === "COMPLETED"
              ? "All done — enjoy!"
              : order.status === "NEW" && minutesSince < 2
                ? "We’ve got your order!"
                : STEP_LABEL[order.status] ?? order.status}
          </h1>
          {order.status === "NEW" && minutesSince < 2 ? (
            <p className="mt-1 text-sm text-foreground-muted">
              The kitchen is reading the ticket. We’ll start cooking in a moment.
            </p>
          ) : null}
          {order.status !== "COMPLETED" ? (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-foreground-muted">
              <Clock className="h-3.5 w-3.5" />
              {etaRemaining > 0
                ? `~${etaRemaining} min left`
                : "Almost ready"}
              {" · placed "}
              {minutesSince < 1 ? "just now" : `${minutesSince} min ago`}
            </p>
          ) : null}
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <ol className="space-y-0">
          {steps.map((s, i) => {
            const Icon = STEP_ICON[s] ?? Package;
            const done = i < stepIdx;
            const current = i === stepIdx;
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : current
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-surface-muted text-foreground-subtle"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  {i < steps.length - 1 ? (
                    <div
                      className={`my-0.5 w-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`}
                      style={{ minHeight: "24px" }}
                    />
                  ) : null}
                </div>
                <div className="pb-4 pt-1">
                  <p className={`text-sm ${current ? "font-medium" : done ? "text-foreground-muted" : "text-foreground-subtle"}`}>
                    {STEP_LABEL[s] ?? s}
                  </p>
                  {current ? (
                    <p className="text-xs text-foreground-muted">Now</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Context info */}
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <div className="flex items-center gap-2 text-foreground-muted">
          {order.channel === "DELIVERY" ? (
            <>
              <MapPin className="h-4 w-4" />
              <span>
                Delivering to <span className="text-foreground">{order.deliveryAddress}</span>
              </span>
            </>
          ) : order.channel === "DINE_IN" ? (
            <>
              <Badge variant="info">Table {order.tableLabel ?? ""}</Badge>
              <span>We’ll bring it to your table.</span>
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              <span>Takeaway — we’ll call when it’s ready for pickup.</span>
            </>
          )}
        </div>
      </div>

      {/* Cancel — only while still NEW (kitchen hasn't started). */}
      {order.status === "NEW" ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          {!cancelOpen ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground-muted">
                Changed your mind? You can cancel until the kitchen starts cooking.
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger-subtle"
                onClick={() => setCancelOpen(true)}
              >
                <X className="h-4 w-4" /> Cancel order
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">Confirm phone to cancel</p>
              <p className="text-xs text-foreground-muted">
                For your safety, enter the phone number used to place this order.
              </p>
              <Input
                placeholder="03001234567"
                value={cancelPhone}
                onChange={(e) => setCancelPhone(e.target.value)}
                inputMode="tel"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setCancelOpen(false)}>
                  Keep order
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  loading={cancelling}
                  onClick={async () => {
                    setCancelling(true);
                    try {
                      const res = await cancelPublicOrderAction({
                        slug,
                        orderId: order.id,
                        phone: cancelPhone.trim(),
                      });
                      if (!res.ok) {
                        haptic.warn();
                        toast({ variant: "danger", title: "Couldn’t cancel", description: res.error });
                      } else {
                        haptic.success();
                        toast({ variant: "success", title: "Order cancelled" });
                        setCancelOpen(false);
                        setOrder((o) => ({ ...o, status: "CANCELLED", cancelReason: "Cancelled by customer" }));
                      }
                    } finally {
                      setCancelling(false);
                    }
                  }}
                >
                  Cancel order
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <OrderSummary order={order} />
    </div>
  );
}

function OrderSummary({ order }: { order: TrackingOrder }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
        Order details
      </h2>
      <ul className="divide-y divide-border">
        {order.items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 py-2 text-sm">
            <span className="font-mono text-foreground-muted">{it.qty}×</span>
            <div className="flex-1">
              <p className="font-medium">
                {it.itemName}{" "}
                <span className="font-normal text-foreground-muted">· {it.variantName}</span>
              </p>
              {it.modifiers.length > 0 ? (
                <p className="text-xs text-foreground-muted">{it.modifiers.join(", ")}</p>
              ) : null}
            </div>
            <p className="font-mono">{formatMoney(it.lineTotalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-0.5 border-t border-border pt-3 text-xs">
        <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
        {order.taxCents > 0 ? <Row label="Tax" value={formatMoney(order.taxCents)} /> : null}
        {order.serviceCents > 0 ? <Row label="Service" value={formatMoney(order.serviceCents)} /> : null}
        {order.deliveryChargeCents > 0 ? (
          <Row label="Delivery" value={formatMoney(order.deliveryChargeCents)} />
        ) : null}
      </dl>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-medium">Total</span>
        <span className="font-mono text-h3">{formatMoney(order.totalCents)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
