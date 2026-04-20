"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Truck, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  cancelOrderAction,
  recordPaymentAction,
  updateOrderStatusAction,
} from "@/server/actions/order.actions";
import { formatMoney, rupeesToPaisa } from "@/lib/utils";

export type OrderDetail = {
  id: string;
  orderNumber: number;
  status: "NEW" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED";
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "WHATSAPP";
  tableLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  subtotalCents: number;
  taxCents: number;
  serviceCents: number;
  discountCents: number;
  tipCents: number;
  deliveryChargeCents: number;
  totalCents: number;
  createdAt: string;
  items: {
    id: string;
    qty: number;
    itemName: string;
    variantName: string;
    unitPriceCents: number;
    lineTotalCents: number;
    notes: string | null;
    modifiers: { name: string; priceDeltaCents: number }[];
  }[];
  payments: {
    id: string;
    method: "CASH" | "CARD" | "JAZZCASH" | "EASYPAISA" | "BANK_TRANSFER" | "SPLIT";
    amountCents: number;
    reference: string | null;
    verification: "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED";
    createdAt: string;
  }[];
};

const NEXT_STATUS = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: null, // requires channel-specific button
  OUT_FOR_DELIVERY: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
} as const;

export function OrderDetailPanel({
  slug,
  order,
  canManage,
  onClose,
}: {
  slug: string;
  order: OrderDetail;
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const paid = order.payments.reduce((s, p) => s + p.amountCents, 0);
  const due = Math.max(0, order.totalCents - paid);

  async function move(toStatus: OrderDetail["status"]) {
    setBusy(true);
    const res = await updateOrderStatusAction(slug, { orderId: order.id, toStatus });
    setBusy(false);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t update", description: res.error });
    else router.refresh();
  }

  async function cancel() {
    const reason = prompt("Cancel reason?");
    if (!reason) return;
    setBusy(true);
    const res = await cancelOrderAction(slug, { orderId: order.id, reason });
    setBusy(false);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t cancel", description: res.error });
    else {
      toast({ variant: "success", title: "Cancelled" });
      onClose();
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm">#{order.orderNumber.toString().padStart(4, "0")}</p>
          <p className="text-xs text-foreground-muted">
            {order.channel} · {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={order.status === "CANCELLED" ? "danger" : order.status === "COMPLETED" ? "success" : "info"}>
          {order.status}
        </Badge>
      </div>

      {/* Customer */}
      {(order.customerName || order.customerPhone || order.tableLabel || order.deliveryAddress) ? (
        <div className="rounded-md border border-border bg-surface p-2 text-xs">
          {order.tableLabel ? <p>Table: <span className="font-medium">{order.tableLabel}</span></p> : null}
          {order.customerName ? <p>Customer: <span className="font-medium">{order.customerName}</span></p> : null}
          {order.customerPhone ? <p>Phone: <span className="font-mono">{order.customerPhone}</span></p> : null}
          {order.deliveryAddress ? <p>Address: <span className="font-medium">{order.deliveryAddress}</span></p> : null}
        </div>
      ) : null}

      {/* Items */}
      <ul className="divide-y divide-border rounded-md border border-border">
        {order.items.map((it) => (
          <li key={it.id} className="p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  <span className="font-mono">{it.qty}×</span> {it.itemName}{" "}
                  <span className="text-foreground-muted">· {it.variantName}</span>
                </p>
                {it.modifiers.length > 0 ? (
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    {it.modifiers.map((m) => m.name).join(", ")}
                  </p>
                ) : null}
                {it.notes ? <p className="mt-0.5 text-xs italic text-foreground-muted">“{it.notes}”</p> : null}
              </div>
              <p className="font-mono">{formatMoney(it.lineTotalCents)}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <dl className="space-y-0.5 text-xs">
        <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
        {order.discountCents > 0 ? <Row label="Discount" value={`− ${formatMoney(order.discountCents)}`} /> : null}
        {order.taxCents > 0 ? <Row label="Tax" value={formatMoney(order.taxCents)} /> : null}
        {order.serviceCents > 0 ? <Row label="Service" value={formatMoney(order.serviceCents)} /> : null}
        {order.tipCents > 0 ? <Row label="Tip" value={formatMoney(order.tipCents)} /> : null}
        {order.deliveryChargeCents > 0 ? <Row label="Delivery" value={formatMoney(order.deliveryChargeCents)} /> : null}
      </dl>
      <div className="flex items-center justify-between border-y border-border py-2">
        <span className="text-sm font-medium">Total</span>
        <span className="font-mono text-h3">{formatMoney(order.totalCents)}</span>
      </div>

      {/* Payments */}
      <div className="rounded-md border border-border p-2 text-xs">
        <div className="flex items-center justify-between text-foreground-muted">
          <span>Paid</span>
          <span className="font-mono">{formatMoney(paid)} / {formatMoney(order.totalCents)}</span>
        </div>
        {order.payments.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={p.verification === "VERIFIED" ? "success" : p.verification === "FAILED" ? "danger" : "warning"}>
                    {p.verification}
                  </Badge>
                  <span className="font-mono">{formatMoney(p.amountCents)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {due > 0 && order.status !== "CANCELLED" ? (
          <PaymentForm slug={slug} orderId={order.id} dueCents={due} />
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {order.status === "NEW" || order.status === "PREPARING" ? (
          <Button onClick={() => move(NEXT_STATUS[order.status]!)} loading={busy}>
            <ChevronRight className="h-4 w-4" /> Mark {NEXT_STATUS[order.status]}
          </Button>
        ) : null}
        {order.status === "READY" && order.channel === "DELIVERY" ? (
          <Button onClick={() => move("OUT_FOR_DELIVERY")} loading={busy}>
            <Truck className="h-4 w-4" /> Out for delivery
          </Button>
        ) : order.status === "READY" ? (
          <Button onClick={() => move("COMPLETED")} loading={busy} disabled={due > 0}>
            <CheckCircle2 className="h-4 w-4" /> Complete
          </Button>
        ) : null}
        {order.status === "OUT_FOR_DELIVERY" ? (
          <Button onClick={() => move("COMPLETED")} loading={busy} disabled={due > 0}>
            <CheckCircle2 className="h-4 w-4" /> Mark delivered
          </Button>
        ) : null}
        {due > 0 && (order.status === "READY" || order.status === "OUT_FOR_DELIVERY") ? (
          <Badge variant="warning">Payment due</Badge>
        ) : null}
        {canManage && order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
          <Button variant="ghost" onClick={cancel} loading={busy}>
            <X className="h-4 w-4" /> Cancel order
          </Button>
        ) : null}
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

function PaymentForm({ slug, orderId, dueCents }: { slug: string; orderId: string; dueCents: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [method, setMethod] = React.useState<"CASH" | "CARD" | "JAZZCASH" | "EASYPAISA" | "BANK_TRANSFER">("CASH");
  const [amount, setAmount] = React.useState((dueCents / 100).toFixed(2));
  const [reference, setReference] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    const amountRupees = parseFloat(amount);
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      toast({ variant: "warning", title: "Enter a valid amount" });
      return;
    }
    setBusy(true);
    const res = await recordPaymentAction(slug, {
      orderId,
      method,
      amountRupees,
      reference,
    });
    setBusy(false);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t record", description: res.error });
    else {
      toast({ variant: "success", title: "Payment recorded" });
      router.refresh();
    }
  }

  const methodNeedsRef = method === "JAZZCASH" || method === "EASYPAISA" || method === "BANK_TRANSFER";
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium">Take payment</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="JAZZCASH">JazzCash</option>
          <option value="EASYPAISA">Easypaisa</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
        <Input
          type="number"
          step="0.01"
          min="0"
          className="h-8 text-xs"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      {methodNeedsRef ? (
        <Input
          placeholder="Transaction reference"
          className="h-8 text-xs"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      ) : null}
      <Button size="sm" onClick={submit} loading={busy} disabled={methodNeedsRef && !reference}>
        <CreditCard className="h-3 w-3" /> Record payment
      </Button>
    </div>
  );
}
