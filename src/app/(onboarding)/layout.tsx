import Link from "next/link";
import { APP } from "@/lib/config/app";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
            </span>
            <span>{APP.name}</span>
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
