"use client";

import * as React from "react";
import {
  Bike,
  Clock,
  MessageCircle,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatMoney } from "@/lib/utils";

export type OrderListItem = {
  id: string;
  orderNumber: number;
  status: "NEW" | "PREPARING" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELLED";
  channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "WHATSAPP";
  totalCents: number;
  tableLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  items: { qty: number; itemName: string; variantName: string }[];
};

const CHANNEL_ICON = {
  DINE_IN: UtensilsCrossed,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Bike,
  ONLINE: Smartphone,
  WHATSAPP: MessageCircle,
} as const;

const CHANNEL_LABEL = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
  ONLINE: "Online",
  WHATSAPP: "WhatsApp",
} as const;

const CHANNEL_TONE: Record<OrderListItem["channel"], string> = {
  DINE_IN: "bg-info-subtle text-info",
  TAKEAWAY: "bg-primary-subtle text-primary",
  DELIVERY: "bg-warning-subtle text-warning",
  ONLINE: "bg-success-subtle text-success",
  WHATSAPP: "bg-success-subtle text-success",
};

export function ageBucket(createdAt: string): "fresh" | "warm" | "cold" {
  const ageMin = (Date.now() - new Date(createdAt).getTime()) / 60_000;
  if (ageMin < 5) return "fresh";
  if (ageMin < 10) return "warm";
  return "cold";
}

export function ageMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

export function OrderCard({
  order,
  paidCents,
  onClick,
  compact = false,
}: {
  order: OrderListItem;
  paidCents?: number;
  onClick?: () => void;
  compact?: boolean;
}) {
  const Icon = CHANNEL_ICON[order.channel];
  const bucket = ageBucket(order.createdAt);
  const totalItems = order.items.reduce((s, it) => s + it.qty, 0);
  const paid = paidCents ?? 0;
  const paidStatus: "paid" | "partial" | "unpaid" =
    paid >= order.totalCents ? "paid" : paid > 0 ? "partial" : "unpaid";
  const minutes = ageMinutes(order.createdAt);

  const ageTone: Record<string, string> = {
    fresh: "bg-success/10 text-success",
    warm: "bg-warning/10 text-warning",
    cold: "bg-danger/10 text-danger",
  };
  const borderTone: Record<string, string> = {
    fresh: "border-l-success",
    warm: "border-l-warning",
    cold: "border-l-danger",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group block w-full overflow-hidden rounded-2xl border-l-[4px] border-y border-r bg-background text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]",
        borderTone[bucket],
        "border-y-border border-r-border",
        order.status === "CANCELLED" && "opacity-60",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              CHANNEL_TONE[order.channel],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-mono text-sm font-semibold leading-none">
              #{order.orderNumber.toString().padStart(4, "0")}
            </p>
            <p className="mt-0.5 text-[10px] text-foreground-muted">
              {CHANNEL_LABEL[order.channel]}
              {order.tableLabel ? ` · ${order.tableLabel}` : ""}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
            ageTone[bucket],
          )}
        >
          <Clock className="h-3 w-3" />
          {minutes}m
        </span>
      </div>

      {/* Customer */}
      {order.customerName || order.customerPhone ? (
        <p className="mt-1 truncate px-3 text-xs text-foreground-muted">
          {order.customerName ?? order.customerPhone}
        </p>
      ) : null}

      {/* Items */}
      {!compact ? (
        <ul className="mt-2 space-y-0.5 border-t border-border bg-surface-muted/30 px-3 py-2 text-xs">
          {order.items.slice(0, 3).map((it, i) => (
            <li key={i} className="flex items-baseline gap-1.5">
              <span className="font-mono text-foreground">{it.qty}×</span>
              <span className="truncate text-foreground-muted">
                <span className="text-foreground">{it.itemName}</span>
                {it.variantName ? (
                  <span className="text-foreground-subtle"> · {it.variantName}</span>
                ) : null}
              </span>
            </li>
          ))}
          {order.items.length > 3 ? (
            <li className="text-[10px] text-foreground-subtle">
              +{order.items.length - 3} more item{order.items.length - 3 === 1 ? "" : "s"}
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Badge
            variant={paidStatus === "paid" ? "success" : paidStatus === "partial" ? "warning" : "danger"}
            className="text-[10px]"
          >
            {paidStatus === "paid" ? "✓ Paid" : paidStatus === "partial" ? "Partial" : "Unpaid"}
          </Badge>
          {!compact ? (
            <span className="font-mono text-[10px] text-foreground-subtle">
              {totalItems} item{totalItems === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <p className="font-mono text-sm font-semibold">{formatMoney(order.totalCents)}</p>
      </div>
    </button>
  );
}
