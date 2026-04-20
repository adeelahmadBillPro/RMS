import Link from "next/link";
import { APP } from "@/lib/config/app";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
          </span>
          <span>{APP.name}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/pricing" className="text-foreground-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="text-foreground-muted hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="md:hidden">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
