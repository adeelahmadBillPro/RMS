"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TenantRole } from "@prisma/client";
import { APP } from "@/lib/config/app";

interface TopbarProps {
  tenantName: string;
  userName: string | null | undefined;
  role: TenantRole;
}

export function Topbar({ tenantName, userName, role }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{tenantName}</span>
          <span className="text-xs text-foreground-muted">{userName}</span>
        </div>
        <Badge variant="primary" className="hidden sm:inline-flex">
          {role}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
