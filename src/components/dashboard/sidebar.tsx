"use client";

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
  Truck,
  Table2,
  BarChart3,
  Settings,
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
  { href: "/deliveries", icon: Truck, label: "Deliveries" },
  { href: "/tables", icon: Table2, label: "Tables" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ slug }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="hidden border-r border-border bg-surface md:flex md:w-60 md:flex-col">
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const href = `/${slug}${item.href}`;
          const isActive =
            pathname === href ||
            (item.href !== "" && pathname.startsWith(`${href}/`)) ||
            (item.href === "" && pathname === `/${slug}`);
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary-subtle text-primary"
                  : "border-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-xs text-foreground-subtle">
        Phase 1 ships the workspace shell. Modules light up in upcoming phases.
      </div>
    </aside>
  );
}
