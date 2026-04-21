import { cn } from "@/lib/utils";

/**
 * Soft warm canvas: gradient + corner glows + faint dot grid.
 * Reused across dashboard, super-admin, and other inner shells so the whole
 * product shares the same backdrop as the auth panel.
 */
export function WarmCanvas({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-surface via-background to-primary-subtle/40",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-[360px] w-[360px] rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.30]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border-strong)) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 75%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
