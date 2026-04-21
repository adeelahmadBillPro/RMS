"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

function GoogleGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.92v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.94H.92A9 9 0 0 0 0 9c0 1.45.35 2.82.92 4.06l3.04-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .92 4.94l3.04 2.34C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  callbackUrl,
  label = "Continue with Google",
  className,
}: {
  callbackUrl?: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className={`w-full ${className ?? ""}`}
      loading={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl: callbackUrl ?? "/" });
      }}
    >
      <GoogleGlyph />
      {label}
    </Button>
  );
}

export function AuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-foreground-muted">
      <span className="h-px flex-1 bg-border" />
      <span className="uppercase tracking-wide">{text}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
