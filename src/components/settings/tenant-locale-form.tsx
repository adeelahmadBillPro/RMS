"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import {
  tenantLocaleSchema,
  type TenantLocaleInput,
} from "@/lib/validations/tenant-settings.schema";
import { updateTenantLocaleAction } from "@/server/actions/tenant-settings.actions";

const CURRENCIES = ["PKR", "USD", "AED", "SAR", "GBP", "EUR", "INR"];
const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
];
const LOCALES = [
  { v: "en", l: "English" },
  { v: "ur", l: "Urdu" },
  { v: "ar", l: "Arabic" },
];

export function TenantLocaleForm({
  slug,
  canManage,
  initial,
}: {
  slug: string;
  canManage: boolean;
  initial: TenantLocaleInput;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid },
  } = useForm<TenantLocaleInput>({
    resolver: zodResolver(tenantLocaleSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: TenantLocaleInput) {
    setSaving(true);
    const res = await updateTenantLocaleAction(slug, values);
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Localization saved" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("currency")}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <FieldHint>Symbol shown on menu & receipts.</FieldHint>
        </FormField>
        <FormField>
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("timezone")}
          >
            {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <FieldHint>Used for opening hours and order timestamps.</FieldHint>
        </FormField>
        <FormField>
          <Label htmlFor="locale">Language</Label>
          <select
            id="locale"
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("locale")}
          >
            {LOCALES.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
          </select>
          <FieldHint>Dashboard + customer-site language hint.</FieldHint>
        </FormField>
      </div>
      {canManage ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" loading={saving} disabled={!isDirty || !isValid}>
            Save localization
          </Button>
        </div>
      ) : null}
    </form>
  );
}
