"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth.schema";
import { resetPassword } from "@/server/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldError, FormField } from "@/components/ui/form-field";
import { PasswordStrengthMeter } from "./password-strength-meter";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Strip the token from the URL bar + history on mount so it doesn't leak
  // via referer to next pages, screenshots, or the user's address bar.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search.includes("token=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { token },
  });
  const passwordValue = watch("password") ?? "";

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await resetPassword(values);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) {
          setError(field as keyof ResetPasswordInput, { message });
        }
      } else {
        setServerError(res.error);
      }
      setSubmitting(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-h3">Password updated</h2>
        <p className="text-sm text-foreground-muted">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />

      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger"
        >
          {serverError}{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Request a new link
          </Link>
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="password" required>
          New password
        </Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
        <div className="mt-2">
          <PasswordStrengthMeter password={passwordValue} />
        </div>
      </FormField>

      <FormField>
        <Label htmlFor="confirmPassword" required>
          Confirm password
        </Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        <FieldError message={errors.confirmPassword?.message} />
      </FormField>

      <Button type="submit" className="w-full" loading={submitting}>
        {submitting ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
