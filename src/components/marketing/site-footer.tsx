import Link from "next/link";
import { APP } from "@/lib/config/app";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container flex flex-col items-center justify-between gap-3 py-8 text-xs text-foreground-muted md:flex-row">
        <div>
          © {new Date().getFullYear()} {APP.legal.company}. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <a href={`mailto:${APP.supportEmail}`} className="hover:text-foreground">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
