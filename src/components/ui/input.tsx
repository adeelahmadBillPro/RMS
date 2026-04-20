"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 text-sm transition-colors duration-150",
          "placeholder:text-foreground-subtle",
          "focus-visible:outline-none focus-visible:ring-2",
          "disabled:cursor-not-allowed disabled:bg-surface-muted",
          invalid
            ? "border-danger focus-visible:border-danger focus-visible:ring-danger/20"
            : "border-border focus-visible:border-primary focus-visible:ring-primary/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
