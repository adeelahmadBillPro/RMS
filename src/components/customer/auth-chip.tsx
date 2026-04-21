"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogIn, User, LogOut } from "lucide-react";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";

export function CustomerAuthChip({ slug }: { slug: string }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  if (status === "loading") {
    return <span className="h-8 w-20 animate-pulse rounded-full bg-surface-raised" />;
  }

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <LogIn className="h-3.5 w-3.5" />
          Login
        </button>
        <LoginRequiredDialog
          open={open}
          onOpenChange={setOpen}
          callbackUrl={`/r/${slug}`}
          title="Login to your account"
          description="Track orders, save addresses, and see your favorites."
        />
      </>
    );
  }

  const name = session.user?.name ?? "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:border-primary"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{name.split(" ")[0]}</span>
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium">{name}</p>
            <p className="truncate text-[11px] text-foreground-muted">{session.user?.email}</p>
          </div>
          <Link
            href={`/r/${slug}/account`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface"
            onClick={() => setMenuOpen(false)}
          >
            <User className="h-3.5 w-3.5" /> My account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              signOut({ callbackUrl: `/r/${slug}` });
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-xs text-foreground-muted hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
