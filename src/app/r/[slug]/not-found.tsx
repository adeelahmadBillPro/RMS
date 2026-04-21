import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerNotFound() {
  return (
    <div className="container max-w-md py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-subtle">
        <Search className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-h2">Page not found</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        We couldn&rsquo;t find what you were looking for. The link may be old or the
        restaurant may have changed its address.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
