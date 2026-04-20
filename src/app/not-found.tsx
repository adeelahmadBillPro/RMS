import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <p className="font-mono text-xs text-foreground-muted">404</p>
      <h1 className="mt-2 text-h1">Page not found</h1>
      <p className="mt-2 text-body text-foreground-muted">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
