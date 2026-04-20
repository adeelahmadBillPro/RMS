"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Truck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  assignDeliveryAction,
  reconcileCashAction,
} from "@/server/actions/delivery.actions";
import { formatMoney } from "@/lib/utils";
import type {
  DeliveryOrderRow,
  PendingSubmissionRow,
  RecentSubmissionRow,
  RiderPick,
} from "./types";

type Tab = "active" | "cash";

export function DeliveryWorkspace({
  slug,
  canManage,
  initialTab,
  orders,
  riders,
  pendingSubs,
  recentSubs,
}: {
  slug: string;
  canManage: boolean;
  initialTab: Tab;
  orders: DeliveryOrderRow[];
  riders: RiderPick[];
  pendingSubs: PendingSubmissionRow[];
  recentSubs: RecentSubmissionRow[];
}) {
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [assigning, setAssigning] = React.useState<DeliveryOrderRow | null>(null);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-border">
        <TabButton active={tab === "active"} onClick={() => setTab("active")}>
          Active orders
          <Count value={orders.length} />
        </TabButton>
        <TabButton active={tab === "cash"} onClick={() => setTab("cash")}>
          Cash reconciliation
          <Count value={pendingSubs.length} />
        </TabButton>
      </nav>

      {tab === "active" ? (
        <ActiveOrders orders={orders} canManage={canManage} onAssign={setAssigning} />
      ) : (
        <CashReconciliation slug={slug} pending={pendingSubs} recent={recentSubs} canManage={canManage} />
      )}

      <AssignDialog
        slug={slug}
        order={assigning}
        riders={riders}
        onClose={() => setAssigning(null)}
      />
    </div>
  );
}

function ActiveOrders({
  orders,
  canManage,
  onAssign,
}: {
  orders: DeliveryOrderRow[];
  canManage: boolean;
  onAssign: (o: DeliveryOrderRow) => void;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-5 w-5" />}
        title="No delivery orders"
        description="Delivery orders (from POS or the customer site) will show up here."
      />
    );
  }

  const unassigned = orders.filter((o) => !o.assignment || o.assignment.status === "CANCELLED");
  const onTheWay = orders.filter(
    (o) => o.assignment && (o.assignment.status === "PICKED_UP" || o.assignment.status === "ASSIGNED"),
  );
  const finished = orders.filter(
    (o) =>
      o.assignment &&
      (o.assignment.status === "DELIVERED" || o.assignment.status === "RETURNED"),
  );

  return (
    <div className="space-y-4">
      <Section title="Needs a rider" count={unassigned.length} tone="warning">
        {unassigned.length === 0 ? (
          <p className="text-xs text-foreground-muted">All caught up.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {unassigned.map((o) => (
              <OrderCard key={o.id} order={o}>
                {canManage ? (
                  <Button size="sm" onClick={() => onAssign(o)}>
                    <UserPlus className="h-3 w-3" /> Assign
                  </Button>
                ) : null}
              </OrderCard>
            ))}
          </div>
        )}
      </Section>

      <Section title="On the way" count={onTheWay.length} tone="info">
        {onTheWay.length === 0 ? (
          <p className="text-xs text-foreground-muted">No active drops.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {onTheWay.map((o) => (
              <OrderCard key={o.id} order={o}>
                {canManage ? (
                  <Button size="sm" variant="ghost" onClick={() => onAssign(o)}>
                    Reassign
                  </Button>
                ) : null}
              </OrderCard>
            ))}
          </div>
        )}
      </Section>

      <Section title="Finished (24h)" count={finished.length} tone="neutral">
        {finished.length === 0 ? (
          <p className="text-xs text-foreground-muted">Nothing yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {finished.map((o) => (
              <OrderCard key={o.id} order={o} compact />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "warning" | "info" | "neutral";
  children: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    warning: "bg-warning",
    info: "bg-info",
    neutral: "bg-foreground-subtle",
  };
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className={`inline-block h-2 w-2 rounded-full ${dot[tone]}`} />
        {title}
        <Badge variant="neutral">{count}</Badge>
      </h2>
      {children}
    </section>
  );
}

function OrderCard({
  order,
  children,
  compact = false,
}: {
  order: DeliveryOrderRow;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const a = order.assignment;
  const statusColor: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
    ASSIGNED: "info",
    PICKED_UP: "warning",
    DELIVERED: "success",
    RETURNED: "danger",
    CANCELLED: "neutral",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium">
            #{order.orderNumber.toString().padStart(4, "0")}
            {order.customerName ? (
              <span className="ml-2 font-sans font-normal text-foreground-muted">
                {order.customerName}
              </span>
            ) : null}
          </p>
          {!compact ? (
            <>
              {order.deliveryAddress ? (
                <p className="mt-1 flex items-start gap-1 text-xs text-foreground-muted">
                  <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-2">{order.deliveryAddress}</span>
                </p>
              ) : null}
              {order.customerPhone ? (
                <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-foreground-muted">
                  <Phone className="h-3 w-3" /> {order.customerPhone}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">{formatMoney(order.totalCents)}</p>
          {a ? (
            <Badge variant={statusColor[a.status] ?? "neutral"} className="mt-1">
              {a.status}
            </Badge>
          ) : (
            <Badge variant="warning" className="mt-1">NEEDS RIDER</Badge>
          )}
        </div>
      </div>
      {a && !compact ? (
        <p className="mt-2 text-xs text-foreground-muted">
          Rider: <span className="text-foreground">{a.riderName}</span>
          {a.collectedCashCents > 0 ? (
            <>
              {" · "}collected <span className="font-mono text-foreground">{formatMoney(a.collectedCashCents)}</span>
            </>
          ) : null}
          {a.returnReason ? (
            <>
              {" · "}<span className="text-danger">returned: {a.returnReason}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {children ? <div className="mt-2 flex justify-end">{children}</div> : null}
    </div>
  );
}

function AssignDialog({
  slug,
  order,
  riders,
  onClose,
}: {
  slug: string;
  order: DeliveryOrderRow | null;
  riders: RiderPick[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [riderId, setRiderId] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (order?.assignment) {
      setRiderId(order.assignment.riderId);
    } else if (riders[0]) {
      setRiderId(riders[0].userId);
    }
  }, [order, riders]);

  async function submit() {
    if (!order) return;
    setSubmitting(true);
    const res = await assignDeliveryAction(slug, {
      orderId: order.id,
      deliveryUserId: riderId,
      notes,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t assign", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Rider assigned" });
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign rider</DialogTitle>
          <DialogDescription>
            {order
              ? `Order #${order.orderNumber.toString().padStart(4, "0")} · ${formatMoney(
                  order.totalCents,
                )}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {riders.length === 0 ? (
          <p className="rounded-lg border border-warning bg-warning-subtle p-3 text-sm text-warning">
            No delivery members yet. Invite staff with role = DELIVERY to assign orders.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">Rider</label>
              <select
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {riders.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.name} · {r.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground-muted">
                Notes (optional)
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Customer asked for the side gate"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!riderId || riders.length === 0} loading={submitting}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashReconciliation({
  slug,
  pending,
  recent,
  canManage,
}: {
  slug: string;
  pending: PendingSubmissionRow[];
  recent: RecentSubmissionRow[];
  canManage: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [disputeId, setDisputeId] = React.useState<string | null>(null);
  const [disputeNote, setDisputeNote] = React.useState("");

  async function reconcile(id: string) {
    setBusyId(id);
    const res = await reconcileCashAction(slug, { submissionId: id, decision: "RECONCILED" });
    setBusyId(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t reconcile", description: res.error });
    else {
      toast({ variant: "success", title: "Reconciled" });
      router.refresh();
    }
  }
  async function dispute() {
    if (!disputeId) return;
    setBusyId(disputeId);
    const res = await reconcileCashAction(slug, {
      submissionId: disputeId,
      decision: "DISPUTED",
      reconcileNotes: disputeNote,
    });
    setBusyId(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t save", description: res.error });
    else {
      toast({ variant: "success", title: "Marked disputed" });
      setDisputeId(null);
      setDisputeNote("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium">Pending envelopes</h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Nothing to reconcile"
            description="When a rider submits their end-of-shift cash, it’ll appear here."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.riderName}</p>
                    <p className="flex items-center gap-1 text-xs text-foreground-muted">
                      <Clock className="h-3 w-3" />
                      {new Date(p.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-mono text-h3">{formatMoney(p.totalCents)}</p>
                </div>
                <p className="mt-2 text-xs text-foreground-muted">
                  {p.count} delivered order{p.count === 1 ? "" : "s"}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-foreground-muted">
                  {p.orders.slice(0, 4).map((o) => (
                    <li key={o.orderNumber} className="flex justify-between">
                      <span>
                        #{o.orderNumber.toString().padStart(4, "0")}
                        {o.customerName ? ` · ${o.customerName}` : ""}
                      </span>
                      <span className="font-mono">{formatMoney(o.collectedCashCents)}</span>
                    </li>
                  ))}
                  {p.orders.length > 4 ? <li>+{p.orders.length - 4} more</li> : null}
                </ul>
                {p.notes ? (
                  <p className="mt-2 rounded-md bg-surface-muted p-2 text-xs italic text-foreground-muted">
                    “{p.notes}”
                  </p>
                ) : null}
                {canManage ? (
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      onClick={() => reconcile(p.id)}
                      loading={busyId === p.id && disputeId !== p.id}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Reconcile
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDisputeId(p.id)}
                    >
                      <XCircle className="h-3 w-3" /> Dispute
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium">Recently closed</h2>
          <div className="rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                  <th className="px-4 py-2 text-left font-medium">Rider</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Closed</th>
                  <th className="px-4 py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2">{r.riderName}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMoney(r.totalCents)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={r.status === "RECONCILED" ? "success" : "danger"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground-muted">
                      {r.reconciledAt ? new Date(r.reconciledAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground-muted">
                      {r.reconcileNotes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <Dialog open={!!disputeId} onOpenChange={(o) => !o && setDisputeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute envelope</DialogTitle>
            <DialogDescription>Explain the discrepancy so the rider can follow up.</DialogDescription>
          </DialogHeader>
          <input
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            placeholder="e.g. Rs 200 short vs expected"
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={dispute}
              loading={!!disputeId && busyId === disputeId}
              disabled={disputeNote.trim().length < 3}
            >
              Mark disputed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-foreground-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground-muted">
      {value}
    </span>
  );
}
