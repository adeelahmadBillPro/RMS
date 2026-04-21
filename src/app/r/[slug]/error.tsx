"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ slug: string }>();

  React.useEffect(() => {
    // Surface to whatever observability is wired up (Sentry, console for now).
    // eslint-disable-next-line no-console
    console.error("[customer-error]", error);
  }, [error]);

  return (
    <div className="container max-w-md py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-subtle text-warning">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-h2">Something went wrong</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        We hit a snag loading this page. Try again, or head back to the menu.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[10px] text-foreground-subtle">
          ref {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        {params?.slug ? (
          <Button asChild variant="ghost">
            <Link href={`/r/${params.slug}`}>Back to menu</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
