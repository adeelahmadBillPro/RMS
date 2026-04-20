"use client";

import * as React from "react";
import { Clock, ShoppingBag, Truck, Utensils, Smartphone, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

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
  DINE_IN: Utensils,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
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
  onClick,
  compact = false,
}: {
  order: OrderListItem;
  onClick?: () => void;
  compact?: boolean;
}) {
  const Icon = CHANNEL_ICON[order.channel];
  const bucket = ageBucket(order.createdAt);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border bg-background p-3 text-left transition-colors hover:border-border-strong ${
        bucket === "cold"
          ? "border-l-[3px] border-l-danger border-y-border border-r-border"
          : bucket === "warm"
            ? "border-l-[3px] border-l-warning border-y-border border-r-border"
            : "border-l-[3px] border-l-success border-y-border border-r-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-foreground-muted" />
          <span className="font-mono text-sm font-medium">#{order.orderNumber.toString().padStart(4, "0")}</span>
          {order.tableLabel ? (
            <Badge variant="neutral">{order.tableLabel}</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-xs text-foreground-muted">
          <Clock className="h-3 w-3" />
          {ageMinutes(order.createdAt)}m
        </div>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        {CHANNEL_LABEL[order.channel]}
        {order.customerName ? ` · ${order.customerName}` : ""}
      </p>
      {!compact ? (
        <ul className="mt-2 space-y-0.5 text-xs">
          {order.items.slice(0, 4).map((it, i) => (
            <li key={i} className="text-foreground-muted">
              <span className="font-mono">{it.qty}×</span> {it.itemName}
              {it.variantName ? ` · ${it.variantName}` : ""}
            </li>
          ))}
          {order.items.length > 4 ? (
            <li className="text-foreground-subtle">+{order.items.length - 4} more</li>
          ) : null}
        </ul>
      ) : null}
      <p className="mt-2 text-right font-mono text-sm">{formatMoney(order.totalCents)}</p>
    </button>
  );
}
