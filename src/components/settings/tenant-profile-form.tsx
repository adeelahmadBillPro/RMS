"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import {
  tenantProfileSchema,
  type TenantProfileInput,
} from "@/lib/validations/tenant-settings.schema";
import { updateTenantProfileAction } from "@/server/actions/tenant-settings.actions";

const CUISINES: { value: TenantProfileInput["cuisineType"]; label: string }[] = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Café" },
  { value: "FAST_FOOD", label: "Fast food" },
  { value: "BAKERY", label: "Bakery" },
  { value: "CLOUD_KITCHEN", label: "Cloud kitchen" },
  { value: "OTHER", label: "Other" },
];

export function TenantProfileForm({
  slug,
  canManage,
  initial,
}: {
  slug: string;
  canManage: boolean;
  initial: TenantProfileInput;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<TenantProfileInput>({
    resolver: zodResolver(tenantProfileSchema),
    mode: "onBlur",
    defaultValues: initial,
  });
  const color = watch("brandColor");
  const logo = watch("logoUrl");

  async function onSubmit(values: TenantProfileInput) {
    setSaving(true);
    const res = await updateTenantProfileAction(slug, values);
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Profile saved" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-2 ring-border"
          style={color && /^#[0-9a-f]{6}$/i.test(color) ? { backgroundColor: color } : { backgroundColor: "hsl(var(--primary))" }}
        >
          {logo && /^https?:\/\//.test(logo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-primary-foreground">
              {(watch("name") || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">Live preview</p>
          <p className="text-xs text-foreground-muted">
            This is how your brand appears in the customer header.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="name" required>Restaurant name</Label>
          <Input id="name" disabled={!canManage} invalid={!!errors.name} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="cuisineType" required>Cuisine type</Label>
          <select
            id="cuisineType"
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("cuisineType")}
          >
            {CUISINES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input
          id="contactPhone"
          disabled={!canManage}
          placeholder="03001234567"
          {...register("contactPhone")}
        />
        <FieldHint>Shown on your customer site — customers can tap to call.</FieldHint>
      </FormField>

      <FormField>
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          disabled={!canManage}
          placeholder="https://…"
          invalid={!!errors.logoUrl}
          {...register("logoUrl")}
        />
        <FieldHint>Direct link to your logo image (PNG / JPG). Square works best.</FieldHint>
        <FieldError message={errors.logoUrl?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="brandColor">Brand color (hex)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="brandColor"
            disabled={!canManage}
            placeholder="#EA580C"
            invalid={!!errors.brandColor}
            {...register("brandColor")}
          />
          {color && /^#[0-9a-f]{6}$/i.test(color) ? (
            <span
              aria-hidden
              className="h-10 w-10 flex-shrink-0 rounded-md border border-border"
              style={{ backgroundColor: color }}
            />
          ) : null}
        </div>
        <FieldHint>Used for buttons and accents on your customer site.</FieldHint>
        <FieldError message={errors.brandColor?.message} />
      </FormField>

      {canManage ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" loading={saving} disabled={!isDirty || !isValid}>
            Save profile
          </Button>
        </div>
      ) : null}
    </form>
  );
}
