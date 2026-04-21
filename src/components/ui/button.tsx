"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        secondary:
          "bg-surface-muted text-foreground border border-border hover:bg-border",
        ghost:
          "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
        destructive: "bg-accent text-white hover:bg-red-700",
        outline:
          "border border-border bg-background text-foreground hover:bg-surface-muted",
        link: "overflow-visible text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const [shineKey, setShineKey] = React.useState(0);
    // Slot requires a single child, so the shine span (a sibling) is only rendered
    // for non-asChild buttons. Ghost/link variants are too subtle to need it.
    const showShine = !asChild && variant !== "ghost" && variant !== "link";

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (showShine) setShineKey((k) => k + 1);
      onClick?.(e);
    };

    // Slot requires exactly one child element — pass children straight through
    // when asChild is true, otherwise add the shine overlay alongside content.
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          disabled={disabled || loading}
          onClick={handleClick}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {showShine ? (
          <span
            key={shineKey}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent",
              shineKey > 0 && "animate-btn-shine",
            )}
          />
        ) : null}
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
