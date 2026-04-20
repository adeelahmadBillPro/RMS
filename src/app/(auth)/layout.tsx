import Link from "next/link";
import { APP } from "@/lib/config/app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="container flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-mono text-sm">{APP.name.charAt(0)}</span>
          </span>
          <span>{APP.name}</span>
        </Link>
      </header>
      <main className="container flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
