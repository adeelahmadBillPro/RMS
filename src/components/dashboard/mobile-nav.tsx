"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, UtensilsCrossed, MoreHorizontal, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", icon: LayoutDashboard, label: "Home" },
  { href: "/orders", icon: Receipt, label: "Orders" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/expenses", icon: Wallet, label: "Money" },
  { href: "/settings", icon: MoreHorizontal, label: "More" },
];

export function MobileTabBar({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 border-t border-border bg-background md:hidden">
      {TABS.map((t) => {
        const href = `/${slug}${t.href}`;
        const isActive = pathname === href || (t.href !== "" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={t.label}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
              isActive ? "text-primary" : "text-foreground-muted",
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
