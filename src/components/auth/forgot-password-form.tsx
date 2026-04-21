"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, MailCheck } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth.schema";
import { requestPasswordReset } from "@/server/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    const res = await requestPasswordReset(values);
    if (!res.ok) {
      if (res.fieldErrors?.email) {
        setError("email", { message: res.fieldErrors.email });
      }
      setSubmitting(false);
      return;
    }
    setSentTo(values.email);
    setSubmitting(false);
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-h3">Check your inbox</h2>
          <p className="mt-1.5 text-sm text-foreground-muted">
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
            we&rsquo;ve sent a password reset link. The link expires in 30 minutes.
          </p>
        </div>
        <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-xs text-foreground-muted">
          <MailCheck className="mr-1 inline h-3.5 w-3.5" />
          Didn&rsquo;t get the email? Check your spam folder, or{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setSentTo(null)}
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@cafe.com"
          invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </FormField>

      <Button type="submit" className="w-full" loading={submitting}>
        {submitting ? "Sending link…" : "Send reset link"}
      </Button>
    </form>
  );
}
