"use client";

import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema";
import { GoogleSignInButton, AuthDivider } from "./social-auth";

export function LoginRequiredDialog({
  open,
  onOpenChange,
  callbackUrl,
  title = "Login to place your order",
  description = "We keep your orders, addresses, and favorites safe — sign in to continue checkout.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl?: string;
  title?: string;
  description?: string;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    setError(null);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }
    if (callbackUrl) window.location.href = callbackUrl;
    else window.location.reload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <GoogleSignInButton callbackUrl={callbackUrl} />
          <AuthDivider />

          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-danger bg-danger-subtle p-2 text-xs text-danger"
              >
                {error}
              </div>
            ) : null}
            <FormField>
              <Label htmlFor="lrd-email" required>
                Email
              </Label>
              <Input
                id="lrd-email"
                type="email"
                autoComplete="email"
                invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError message={errors.email?.message} />
            </FormField>
            <FormField>
              <Label htmlFor="lrd-password" required>
                Password
              </Label>
              <PasswordInput
                id="lrd-password"
                autoComplete="current-password"
                invalid={!!errors.password}
                {...register("password")}
              />
              <FieldError message={errors.password?.message} />
            </FormField>
            <Button type="submit" className="w-full" loading={submitting} disabled={!isValid}>
              Sign in & continue
            </Button>
          </form>

          <p className="text-center text-xs text-foreground-muted">
            New here?{" "}
            <Link
              href={`/signup${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="font-medium text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-foreground-muted">
            <ShieldCheck className="h-3 w-3" />
            Your details are never shared with the restaurant.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
