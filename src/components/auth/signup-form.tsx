"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth.schema";
import { signupAction } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { GoogleSignInButton, AuthDivider } from "./social-auth";
import { PasswordStrengthMeter } from "./password-strength-meter";

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { acceptTerms: true as unknown as true },
  });
  const passwordValue = watch("password") ?? "";

  async function onSubmit(values: SignupInput) {
    setSubmitting(true);
    setServerError(null);
    const result = await signupAction(values);
    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof SignupInput, { message });
        }
      }
      setSubmitting(false);
      return;
    }
    // Auto sign-in
    const signin = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (signin?.error) {
      toast({
        variant: "warning",
        title: "Account created",
        description: "Please sign in to continue.",
      });
      router.push("/login");
      return;
    }
    toast({ variant: "success", title: "Welcome aboard", description: "Let’s set up your restaurant." });
    router.push("/onboarding");
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton label="Sign up with Google" />
      <AuthDivider />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger"
        >
          {serverError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="name" required>
            Your name
          </Label>
          <Input id="name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </FormField>

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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="password" required>
            Password
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
            Confirm
          </Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </FormField>
      </div>

      <label className="flex items-start gap-2 text-xs text-foreground-muted">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("acceptTerms")}
        />
        <span>
          I agree to the Terms of Service and Privacy Policy.
        </span>
      </label>
      <FieldError message={errors.acceptTerms?.message} />

      <Button type="submit" className="w-full" loading={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
    </div>
  );
}
