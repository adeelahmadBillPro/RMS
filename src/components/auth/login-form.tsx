"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (res?.error) {
      setServerError("Invalid email or password.");
      setSubmitting(false);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger"
        >
          {serverError}
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </FormField>

      <FormField>
        <div className="mb-1.5 flex items-baseline justify-between">
          <Label htmlFor="password" required className="mb-0">
            Password
          </Label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </FormField>

      <Button
        type="submit"
        className="w-full"
        loading={submitting}
        disabled={!isValid}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
