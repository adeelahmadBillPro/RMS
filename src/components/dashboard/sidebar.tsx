"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  PackageSearch,
  ChefHat,
  Wallet,
  Users,
  CalendarClock,
  CircleDollarSign,
  Bike,
  Table2,
  BarChart3,
  MessagesSquare,
  Settings,
  Tag,
  Ticket,
  Star,
  CreditCard,
  GripVertical,
  Pencil,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  slug: string;
}

const NAV = [
  { href: "", icon: LayoutDashboard, label: "Overview" },
  { href: "/orders", icon: Receipt, label: "Orders" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/inventory", icon: PackageSearch, label: "Inventory" },
  { href: "/recipes", icon: ChefHat, label: "Recipes" },
  { href: "/expenses", icon: Wallet, label: "Expenses" },
  { href: "/staff", icon: Users, label: "Staff" },
  { href: "/shifts", icon: CalendarClock, label: "Shifts" },
  { href: "/payroll", icon: CircleDollarSign, label: "Payroll" },
  { href: "/deliveries", icon: Bike, label: "Deliveries" },
  { href: "/tables", icon: Table2, label: "Tables" },
  { href: "/deals", icon: Tag, label: "Deals" },
  { href: "/coupons", icon: Ticket, label: "Coupons" },
  { href: "/reviews", icon: Star, label: "Reviews" },
  { href: "/whatsapp", icon: MessagesSquare, label: "WhatsApp" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

const DEFAULT_LABELS: string[] = NAV.map((n) => n.label);
const STORAGE_KEY = "easymenu:sidebar-order:v1";

function loadStoredOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const labels = parsed.filter((v): v is string => typeof v === "string");
    // Drop unknown labels and append any new defaults that aren't in saved order yet
    const known = labels.filter((l) => DEFAULT_LABELS.includes(l));
    const missing = DEFAULT_LABELS.filter((l) => !known.includes(l));
    return [...known, ...missing];
  } catch {
    return null;
  }
}

export function Sidebar({ slug }: SidebarProps) {
  const pathname = usePathname();
  const [order, setOrder] = React.useState<string[]>(DEFAULT_LABELS);
  const [editing, setEditing] = React.useState(false);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  // Hydrate from localStorage on mount only
  React.useEffect(() => {
    const stored = loadStoredOrder();
    if (stored) setOrder(stored);
  }, []);

  function persist(next: string[]) {
    setOrder(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }

  function moveItem(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    const next = order.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    persist(next);
  }

  function resetOrder() {
    persist(DEFAULT_LABELS.slice());
  }

  const itemsByLabel = React.useMemo(() => {
    const map: Record<string, (typeof NAV)[number]> = {};
    for (const n of NAV) map[n.label] = n;
    return map;
  }, []);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-border bg-surface md:flex md:w-60 md:flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
          Workspace
        </span>
        <div className="flex items-center gap-1">
          {editing ? (
            <button
              type="button"
              onClick={resetOrder}
              title="Reset to default order"
              aria-label="Reset sidebar to default order"
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted transition-transform hover:bg-surface-muted hover:text-foreground active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title={editing ? "Done" : "Rearrange menu"}
            aria-label={editing ? "Save sidebar order" : "Rearrange sidebar menu"}
            aria-pressed={editing}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md transition-all active:scale-95",
              editing
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {order.map((label, index) => {
          const item = itemsByLabel[label];
          if (!item) return null;
          const href = `/${slug}${item.href}`;
          const isActive =
            !editing &&
            (pathname === href ||
              (item.href !== "" && pathname.startsWith(`${href}/`)) ||
              (item.href === "" && pathname === `/${slug}`));
          const isDragging = dragIndex === index;

          const rowClass = cn(
            "group flex items-center gap-2 rounded-md border-l-2 px-2 py-2 text-sm transition-colors",
            isActive
              ? "border-primary bg-primary-subtle text-primary"
              : "border-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground",
            isDragging && "opacity-50",
            editing && "cursor-grab active:cursor-grabbing",
          );

          const inner = (
            <>
              {editing ? (
                <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-foreground-subtle" />
              ) : null}
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </>
          );

          if (editing) {
            return (
              <div
                key={label}
                draggable
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) moveItem(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={rowClass}
              >
                {inner}
              </div>
            );
          }

          return (
            <Link key={label} href={href} className={rowClass}>
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-xs text-foreground-subtle">
        {editing
          ? "Drag any item to reorder. Click ✓ to save."
          : "Phase 1 ships the workspace shell. Modules light up in upcoming phases."}
      </div>
    </aside>
  );
}
