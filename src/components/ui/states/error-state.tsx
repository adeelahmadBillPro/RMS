"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "../button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If it keeps happening, contact support.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-h3">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-foreground-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
