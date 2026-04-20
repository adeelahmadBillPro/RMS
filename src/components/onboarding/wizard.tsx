"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight, Plus, X } from "lucide-react";
import { onboardingFullSchema, type OnboardingFullInput } from "@/lib/validations/onboarding.schema";
import { completeOnboardingAction } from "@/server/actions/onboarding.actions";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";

const STEPS = [
  { key: "info", title: "Restaurant info" },
  { key: "brand", title: "Brand & logo" },
  { key: "menu", title: "Menu categories" },
  { key: "tables", title: "Tables & channels" },
  { key: "payments", title: "Payment methods" },
] as const;

const STEP_FIELDS: Record<number, (keyof OnboardingFullInput)[]> = {
  0: ["restaurantName", "slug", "contactPhone", "cuisineType"],
  1: ["logoUrl", "brandColor"],
  2: ["categories"],
  3: ["tableCount", "hasDelivery", "hasTakeaway"],
  4: ["acceptCash", "acceptCard", "acceptJazzCash", "acceptEasypaisa", "acceptBankTransfer"],
};

export function OnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<OnboardingFullInput>({
    resolver: zodResolver(onboardingFullSchema),
    mode: "onBlur",
    defaultValues: {
      restaurantName: "",
      slug: "",
      contactPhone: "",
      cuisineType: "restaurant",
      logoUrl: "",
      brandColor: "",
      categories: ["Starters", "Main course", "Drinks"],
      tableCount: 8,
      hasDelivery: true,
      hasTakeaway: true,
      acceptCash: true,
      acceptCard: false,
      acceptJazzCash: false,
      acceptEasypaisa: false,
      acceptBankTransfer: false,
    },
  });

  const { register, handleSubmit, formState, watch, setValue, control, trigger, setError } = form;
  const errors = formState.errors;

  // Auto-derive slug from restaurant name on first edit
  const restaurantName = watch("restaurantName");
  const slug = watch("slug");
  React.useEffect(() => {
    if (!slug && restaurantName) {
      setValue("slug", slugify(restaurantName).slice(0, 40), { shouldValidate: true });
    }
  }, [restaurantName, slug, setValue]);

  async function next() {
    const fields = STEP_FIELDS[step] ?? [];
    const ok = await trigger(fields);
    if (!ok) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit(values: OnboardingFullInput) {
    setSubmitting(true);
    setServerError(null);
    const result = await completeOnboardingAction(values);
    if (!result.ok) {
      setServerError(result.error);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          setError(field as keyof OnboardingFullInput, { message });
        }
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: "You’re in!", description: "Workspace created." });
    router.push(`/${result.data.slug}`);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((s, idx) => {
          const state = idx < step ? "done" : idx === step ? "current" : "todo";
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  state === "done"
                    ? "bg-primary text-primary-foreground"
                    : state === "current"
                      ? "bg-primary-subtle text-primary ring-1 ring-primary"
                      : "bg-surface-muted text-foreground-muted"
                }`}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span
                className={
                  state === "current" ? "font-medium text-foreground" : "text-foreground-muted"
                }
              >
                {s.title}
              </span>
              {idx < STEPS.length - 1 ? (
                <ChevronRight className="h-3 w-3 text-foreground-subtle" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError ? (
          <div
            role="alert"
            className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger"
          >
            {serverError}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="space-y-4">
            <FormField>
              <Label htmlFor="restaurantName" required>
                Restaurant name
              </Label>
              <Input
                id="restaurantName"
                invalid={!!errors.restaurantName}
                {...register("restaurantName")}
              />
              <FieldError message={errors.restaurantName?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="slug" required>
                URL
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground-muted">easymenu.app/</span>
                <Input id="slug" invalid={!!errors.slug} {...register("slug")} />
              </div>
              <FieldHint>Lowercase letters, numbers and hyphens only.</FieldHint>
              <FieldError message={errors.slug?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="contactPhone" required>
                Contact phone
              </Label>
              <Input
                id="contactPhone"
                placeholder="03001234567"
                invalid={!!errors.contactPhone}
                {...register("contactPhone")}
              />
              <FieldError message={errors.contactPhone?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="cuisineType" required>
                Business type
              </Label>
              <select
                id="cuisineType"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                {...register("cuisineType")}
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="fast_food">Fast food</option>
                <option value="bakery">Bakery</option>
                <option value="cloud_kitchen">Cloud kitchen</option>
                <option value="other">Other</option>
              </select>
              <FieldError message={errors.cuisineType?.message} />
            </FormField>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <FormField>
              <Label htmlFor="logoUrl">Logo URL (optional)</Label>
              <Input
                id="logoUrl"
                placeholder="https://…"
                invalid={!!errors.logoUrl}
                {...register("logoUrl")}
              />
              <FieldHint>Direct URL to a square image. Upload support arrives in Phase 2.</FieldHint>
              <FieldError message={errors.logoUrl?.message} />
            </FormField>
            <FormField>
              <Label htmlFor="brandColor">Brand color (optional)</Label>
              <Input
                id="brandColor"
                placeholder="#EA580C"
                invalid={!!errors.brandColor}
                {...register("brandColor")}
              />
              <FieldError message={errors.brandColor?.message} />
            </FormField>
          </div>
        ) : null}

        {step === 2 ? (
          <Controller
            control={control}
            name="categories"
            render={({ field }) => (
              <CategoriesEditor
                value={field.value}
                onChange={field.onChange}
                error={errors.categories?.message as string | undefined}
              />
            )}
          />
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <FormField>
              <Label htmlFor="tableCount" required>
                How many tables?
              </Label>
              <Input
                id="tableCount"
                type="number"
                min={0}
                invalid={!!errors.tableCount}
                {...register("tableCount", { valueAsNumber: true })}
              />
              <FieldHint>Set to 0 if you don’t do dine-in.</FieldHint>
              <FieldError message={errors.tableCount?.message} />
            </FormField>
            <CheckboxRow id="hasTakeaway" label="We do takeaway" {...register("hasTakeaway")} />
            <CheckboxRow id="hasDelivery" label="We do delivery" {...register("hasDelivery")} />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <CheckboxRow id="acceptCash" label="Cash" {...register("acceptCash")} />
            <CheckboxRow id="acceptCard" label="Card (Visa / Mastercard)" {...register("acceptCard")} />
            <CheckboxRow id="acceptJazzCash" label="JazzCash" {...register("acceptJazzCash")} />
            <CheckboxRow id="acceptEasypaisa" label="Easypaisa" {...register("acceptEasypaisa")} />
            <CheckboxRow
              id="acceptBankTransfer"
              label="Bank transfer"
              {...register("acceptBankTransfer")}
            />
            <p className="text-xs text-foreground-muted">
              Phase 1 records payments manually. Real JazzCash / Easypaisa webhooks land in Phase 3.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || submitting}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button type="submit" loading={submitting}>
              {submitting ? "Setting up…" : "Finish setup"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-surface-muted"
    >
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        {...props}
      />
    </label>
  );
}

function CategoriesEditor({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = React.useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  return (
    <FormField>
      <Label required>Menu categories</Label>
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <p className="text-sm text-foreground-muted">No categories yet — add some below.</p>
        ) : null}
        {value.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="flex items-center gap-1.5 rounded-full bg-primary-subtle py-1 pl-3 pr-1 text-sm text-primary"
          >
            {c}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${c}`}
              className="rounded-full p-0.5 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Burgers"
        />
        <Button type="button" variant="secondary" onClick={add}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <FieldError message={error} />
    </FormField>
  );
}
