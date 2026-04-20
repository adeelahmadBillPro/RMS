import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { APP } from "@/lib/config/app";
import { Badge } from "@/components/ui/badge";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/super-admin");
  if (!session.user.isSuperAdmin) redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/super-admin" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <span className="font-mono text-sm">★</span>
            </span>
            <span>{APP.name}</span>
            <Badge variant="primary">Super admin</Badge>
          </Link>
          <span className="text-xs text-foreground-muted">Signed in as {session.user.email}</span>
        </div>
      </header>
      {children}
    </div>
  );
}
