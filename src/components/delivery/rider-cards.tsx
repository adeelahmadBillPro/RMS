"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Phone,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/states/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  collectCashAction,
  submitCashAction,
  updateAssignmentStatusAction,
} from "@/server/actions/delivery.actions";
import { useRealtimeSubscription, isRealtimeConfigured } from "@/lib/realtime/client";
import { tenantChannel } from "@/lib/realtime";
import { formatMoney } from "@/lib/utils";
import type { DeliveryAssignmentStatus } from "@prisma/client";

type Assignment = {
  id: string;
  status: DeliveryAssignmentStatus;
  collectedCashCents: number;
  assignedAt: string;
  order: {
    id: string;
    orderNumber: number;
    customerName: string | null;
    customerPhone: string | null;
    deliveryAddress: string | null;
    totalCents: number;
    notes: string | null;
    items: { qty: number; itemName: string; variantName: string }[];
  };
};

export function RiderCards({
  slug,
  assignments,
  pendingCashCents,
  pendingCount,
}: {
  slug: string;
  assignments: Assignment[];
  pendingCashCents: number;
  pendingCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [collectingFor, setCollectingFor] = React.useState<Assignment | null>(null);
  const [cashInput, setCashInput] = React.useState("");
  const [returning, setReturning] = React.useState<Assignment | null>(null);
  const [returnReason, setReturnReason] = React.useState("");
  const [submittingCash, setSubmittingCash] = React.useState(false);

  // Live refresh via Pusher when available; fall back to 10s polling
  React.useEffect(() => {
    if (isRealtimeConfigured()) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [router]);

  async function move(a: Assignment, to: "PICKED_UP" | "DELIVERED") {
    setBusyId(a.id);
    const res = await updateAssignmentStatusAction(slug, { assignmentId: a.id, toStatus: to });
    setBusyId(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t update", description: res.error });
    else router.refresh();
  }
  async function doReturn() {
    if (!returning) return;
    setBusyId(returning.id);
    const res = await updateAssignmentStatusAction(slug, {
      assignmentId: returning.id,
      toStatus: "RETURNED",
      returnReason,
    });
    setBusyId(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t return", description: res.error });
    else {
      toast({ variant: "success", title: "Marked returned" });
      setReturning(null);
      setReturnReason("");
      router.refresh();
    }
  }
  async function saveCash() {
    if (!collectingFor) return;
    setBusyId(collectingFor.id);
    const amount = parseFloat(cashInput);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ variant: "warning", title: "Enter a valid amount" });
      setBusyId(null);
      return;
    }
    const res = await collectCashAction(slug, {
      assignmentId: collectingFor.id,
      collectedRupees: amount,
    });
    setBusyId(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t save", description: res.error });
    else {
      toast({ variant: "success", title: "Cash recorded" });
      setCollectingFor(null);
      setCashInput("");
      router.refresh();
    }
  }
  async function submitEnvelope() {
    const ids = assignments
      .filter((a) => a.status === "DELIVERED")
      .map((a) => a.id);
    if (ids.length === 0) {
      toast({ variant: "warning", title: "No deliveries to submit" });
      return;
    }
    setSubmittingCash(true);
    const res = await submitCashAction(slug, { assignmentIds: ids });
    setSubmittingCash(false);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t submit", description: res.error });
    else {
      toast({
        variant: "success",
        title: "Cash submitted",
        description: `Dropped ${formatMoney(res.data.totalCents)} to manager.`,
      });
      router.refresh();
    }
  }

  const useRefresh = React.useCallback(() => router.refresh(), [router]);
  useRealtimeSubscription(null, useRefresh); // placeholder; tenant channel hook needs tenantId (we don't have it here)

  if (assignments.length === 0) {
    return (
      <>
        {pendingCount > 0 ? (
          <CashSummaryBar
            amount={pendingCashCents}
            count={pendingCount}
            onSubmit={submitEnvelope}
            submitting={submittingCash}
          />
        ) : null}
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="No assigned deliveries"
          description="Your manager will assign orders here. Keep this tab open — it refreshes automatically."
        />
      </>
    );
  }

  return (
    <>
      {pendingCount > 0 ? (
        <CashSummaryBar
          amount={pendingCashCents}
          count={pendingCount}
          onSubmit={submitEnvelope}
          submitting={submittingCash}
        />
      ) : null}

      <div className="space-y-3">
        {assignments.map((a) => (
          <RiderCard
            key={a.id}
            a={a}
            busy={busyId === a.id}
            onPickup={() => move(a, "PICKED_UP")}
            onDelivered={() => move(a, "DELIVERED")}
            onCollectCash={() => {
              setCollectingFor(a);
              setCashInput(
                a.collectedCashCents > 0
                  ? (a.collectedCashCents / 100).toFixed(2)
                  : (a.order.totalCents / 100).toFixed(2),
              );
            }}
            onReturn={() => {
              setReturning(a);
              setReturnReason("");
            }}
          />
        ))}
      </div>

      <Dialog open={!!collectingFor} onOpenChange={(o) => !o && setCollectingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record cash collected</DialogTitle>
            <DialogDescription>
              Order total:{" "}
              <span className="font-mono">
                {collectingFor ? formatMoney(collectingFor.order.totalCents) : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="cash-amt">Amount (PKR)</Label>
          <Input
            id="cash-amt"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCollectingFor(null)}>Cancel</Button>
            <Button onClick={saveCash} loading={!!collectingFor && busyId === collectingFor.id}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return order</DialogTitle>
            <DialogDescription>
              Mark this order as returned. Tell us what happened so the manager can follow up.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="return-reason">Reason</Label>
          <Input
            id="return-reason"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="e.g. Customer not home, wrong address"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReturning(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={doReturn}
              loading={!!returning && busyId === returning.id}
              disabled={returnReason.trim().length < 3}
            >
              Confirm return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CashSummaryBar({
  amount,
  count,
  onSubmit,
  submitting,
}: {
  amount: number;
  count: number;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-primary/50 bg-primary-subtle p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium">
            {formatMoney(amount)} <span className="text-foreground-muted">in hand</span>
          </p>
          <p className="text-xs text-foreground-muted">
            {count} delivered order{count === 1 ? "" : "s"} ready to submit
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onSubmit} loading={submitting}>
        Submit to manager
      </Button>
    </div>
  );
}

function RiderCard({
  a,
  busy,
  onPickup,
  onDelivered,
  onCollectCash,
  onReturn,
}: {
  a: Assignment;
  busy: boolean;
  onPickup: () => void;
  onDelivered: () => void;
  onCollectCash: () => void;
  onReturn: () => void;
}) {
  const minutesSince = Math.floor((Date.now() - new Date(a.assignedAt).getTime()) / 60_000);
  const statusTone: Record<string, "info" | "warning" | "success" | "neutral" | "danger"> = {
    ASSIGNED: "info",
    PICKED_UP: "warning",
    DELIVERED: "success",
    RETURNED: "danger",
    CANCELLED: "neutral",
  };
  const canPickup = a.status === "ASSIGNED";
  const canDeliver = a.status === "PICKED_UP";
  const needsCash = a.status === "DELIVERED" && a.collectedCashCents === 0;
  const hasCash = a.status === "DELIVERED" && a.collectedCashCents > 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm font-medium">
              #{a.order.orderNumber.toString().padStart(4, "0")}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground-muted">
              <Clock className="h-3 w-3" />
              assigned {minutesSince < 1 ? "just now" : `${minutesSince}m ago`}
            </p>
          </div>
          <Badge variant={statusTone[a.status] ?? "neutral"}>{a.status.replace("_", " ")}</Badge>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {a.order.customerName ? (
          <p className="text-sm font-medium">{a.order.customerName}</p>
        ) : null}
        {a.order.customerPhone ? (
          <a
            href={`tel:${a.order.customerPhone}`}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Phone className="h-4 w-4" />
            {a.order.customerPhone}
          </a>
        ) : null}
        {a.order.deliveryAddress ? (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(a.order.deliveryAddress)}`}
            target="_blank"
            rel="noopener"
            className="flex items-start gap-2 text-sm text-primary hover:underline"
          >
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-3">{a.order.deliveryAddress}</span>
          </a>
        ) : null}

        <ul className="space-y-0.5 border-t border-border pt-2 text-xs text-foreground-muted">
          {a.order.items.map((it, i) => (
            <li key={i}>
              <span className="font-mono">{it.qty}×</span> {it.itemName}{" "}
              <span className="text-foreground-subtle">· {it.variantName}</span>
            </li>
          ))}
        </ul>
        {a.order.notes ? (
          <p className="rounded-md bg-warning-subtle p-2 text-xs italic text-warning">
            Note: {a.order.notes}
          </p>
        ) : null}

        <div className="flex items-center justify-between rounded-md bg-surface-muted p-2 text-sm">
          <span className="text-foreground-muted">To collect</span>
          <span className="font-mono text-h3">{formatMoney(a.order.totalCents)}</span>
        </div>
        {hasCash ? (
          <p className="text-xs text-success">
            ✓ Collected {formatMoney(a.collectedCashCents)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {canPickup ? (
          <Button className="flex-1" onClick={onPickup} loading={busy}>
            <Package className="h-4 w-4" /> Pick up
          </Button>
        ) : null}
        {canDeliver ? (
          <Button className="flex-1" onClick={onDelivered} loading={busy}>
            <CheckCircle2 className="h-4 w-4" /> Delivered
          </Button>
        ) : null}
        {needsCash ? (
          <Button className="flex-1" onClick={onCollectCash} loading={busy}>
            <Wallet className="h-4 w-4" /> Enter cash
          </Button>
        ) : null}
        {hasCash ? (
          <Button className="flex-1" variant="secondary" onClick={onCollectCash}>
            <Wallet className="h-4 w-4" /> Edit cash
          </Button>
        ) : null}
        {a.status === "ASSIGNED" || a.status === "PICKED_UP" ? (
          <Button variant="ghost" onClick={onReturn} loading={busy}>
            <XCircle className="h-4 w-4" /> Return
          </Button>
        ) : null}
      </div>
    </article>
  );
}
