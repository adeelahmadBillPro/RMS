import { cn } from "@/lib/utils";

/**
 * Pulsing placeholder block. Use to roughly mirror the shape of content
 * that's still loading so the layout doesn't jump on hydration.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-muted/80",
        className,
      )}
      {...props}
    />
  );
}
