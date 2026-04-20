"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, invalid, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm transition-colors duration-150",
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
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
