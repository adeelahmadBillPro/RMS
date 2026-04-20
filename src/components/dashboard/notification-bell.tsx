"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ChefHat,
  CheckCircle2,
  CircleDollarSign,
  MessagesSquare,
  PackageSearch,
  Receipt,
  Truck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeSubscription, isRealtimeConfigured } from "@/lib/realtime/client";
import { tenantChannel } from "@/lib/realtime";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications.actions";

type FeedItem = {
  id: string;
  type:
    | "ORDER_CREATED"
    | "ORDER_READY"
    | "ORDER_OUT_FOR_DELIVERY"
    | "ORDER_COMPLETED"
    | "ORDER_CANCELLED"
    | "LOW_STOCK"
    | "WHATSAPP_MESSAGE"
    | "DELIVERY_CASH_SUBMITTED"
    | "PAYMENT_RECORDED";
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const ICONS: Record<FeedItem["type"], React.ComponentType<{ className?: string }>> = {
  ORDER_CREATED: Receipt,
  ORDER_READY: ChefHat,
  ORDER_OUT_FOR_DELIVERY: Truck,
  ORDER_COMPLETED: CheckCircle2,
  ORDER_CANCELLED: XCircle,
  LOW_STOCK: PackageSearch,
  WHATSAPP_MESSAGE: MessagesSquare,
  DELIVERY_CASH_SUBMITTED: CircleDollarSign,
  PAYMENT_RECORDED: CircleDollarSign,
};

const TONES: Record<FeedItem["type"], string> = {
  ORDER_CREATED: "bg-info-subtle text-info",
  ORDER_READY: "bg-success-subtle text-success",
  ORDER_OUT_FOR_DELIVERY: "bg-warning-subtle text-warning",
  ORDER_COMPLETED: "bg-success-subtle text-success",
  ORDER_CANCELLED: "bg-danger-subtle text-danger",
  LOW_STOCK: "bg-warning-subtle text-warning",
  WHATSAPP_MESSAGE: "bg-primary-subtle text-primary",
  DELIVERY_CASH_SUBMITTED: "bg-info-subtle text-info",
  PAYMENT_RECORDED: "bg-success-subtle text-success",
};

export function NotificationBell({ slug, tenantId }: { slug: string; tenantId: string }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<FeedItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/public/notifications?tenant=${slug}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount: number; items: FeedItem[] };
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      /* ignore */
    }
  }, [slug]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Live updates
  useRealtimeSubscription(tenantChannel(tenantId), () => void load());

  // Polling fallback when Pusher isn't wired
  React.useEffect(() => {
    if (isRealtimeConfigured()) return;
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleClick(n: FeedItem) {
    if (!n.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      await markNotificationReadAction(slug, n.id);
    }
    if (n.href) {
      setOpen(false);
    }
  }
  async function markAllRead() {
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await markAllNotificationsReadAction(slug);
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[360px] animate-scale-in overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 ? (
                <p className="text-xs text-foreground-muted">
                  {unread} unread
                </p>
              ) : (
                <p className="text-xs text-foreground-muted">You’re all caught up</p>
              )}
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </header>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-foreground-subtle" />
                <p className="mt-2 text-sm font-medium">No notifications yet</p>
                <p className="mt-1 px-6 text-xs text-foreground-muted">
                  New orders, low-stock alerts and WhatsApp messages will land here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONS[n.type] ?? Bell;
                  const tone = TONES[n.type];
                  const isUnread = !n.readAt;
                  const content = (
                    <div
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors",
                        isUnread ? "bg-primary-subtle/30" : "hover:bg-surface-muted/60",
                      )}
                    >
                      <span
                        className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full", tone)}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {n.title}
                          {isUnread ? (
                            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" />
                          ) : null}
                        </p>
                        {n.body ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-foreground-muted">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-foreground-subtle">
                          {formatAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => handleClick(n)} className="block">
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClick(n)}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}
