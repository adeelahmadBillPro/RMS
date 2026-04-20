"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryCreateInput,
} from "@/lib/validations/menu.schema";
import { createCategoryAction, updateCategoryAction } from "@/server/actions/menu.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import type { CategoryRow } from "./types";

interface Props {
  slug: string;
  initial: CategoryRow | null;
  existingCount: number;
  onDone: () => void;
}

type FormShape = CategoryCreateInput & {
  id?: string;
  scheduleEnabled: boolean;
  scheduledStartHHMM: string;
  scheduledEndHHMM: string;
};

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map((p) => Number(p));
  return (h ?? 0) * 60 + (m ?? 0);
}

function minToHHMM(min: number | null | undefined) {
  if (min == null) return "07:00";
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function CategoryForm({ slug, initial, existingCount, onDone }: Props) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? categoryUpdateSchema : categoryCreateSchema),
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      nameUr: initial?.nameUr ?? "",
      sortOrder: initial?.sortOrder ?? existingCount,
      isActive: initial?.isActive ?? true,
      scheduledStartMin: initial?.scheduledStartMin ?? null,
      scheduledEndMin: initial?.scheduledEndMin ?? null,
      scheduleEnabled:
        initial != null && initial.scheduledStartMin != null && initial.scheduledEndMin != null,
      scheduledStartHHMM: minToHHMM(initial?.scheduledStartMin),
      scheduledEndHHMM: minToHHMM(initial?.scheduledEndMin ?? 660),
    },
  });

  const scheduleEnabled = watch("scheduleEnabled");

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const payload = {
      ...(isEdit ? { id: values.id! } : {}),
      name: values.name,
      nameUr: values.nameUr,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      scheduledStartMin: values.scheduleEnabled ? hhmmToMin(values.scheduledStartHHMM) : null,
      scheduledEndMin: values.scheduleEnabled ? hhmmToMin(values.scheduledEndHHMM) : null,
    };
    const res = isEdit
      ? await updateCategoryAction(slug, payload)
      : await createCategoryAction(slug, payload);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) {
          setError(k as keyof FormShape, { message: m });
        }
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: isEdit ? "Category updated" : "Category created" });
    onDone();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {serverError}
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="name" required>
          Category name
        </Label>
        <Input id="name" invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="nameUr">Urdu name (optional)</Label>
        <Input id="nameUr" dir="rtl" className="font-urdu" {...register("nameUr")} />
      </FormField>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("isActive")}
        />
        <span>
          <span className="font-medium">Visible on menu</span>
          <span className="block text-xs text-foreground-muted">Hide categories you’re not currently selling.</span>
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("scheduleEnabled")}
        />
        <span>
          <span className="font-medium">Time-restricted (e.g. breakfast menu)</span>
          <span className="block text-xs text-foreground-muted">Category appears only during this window.</span>
        </span>
      </label>

      {scheduleEnabled ? (
        <div className="grid grid-cols-2 gap-4">
          <FormField>
            <Label htmlFor="scheduledStartHHMM">From</Label>
            <Input id="scheduledStartHHMM" type="time" {...register("scheduledStartHHMM")} />
            <FieldHint>24-hour format.</FieldHint>
          </FormField>
          <FormField>
            <Label htmlFor="scheduledEndHHMM">Until</Label>
            <Input id="scheduledEndHHMM" type="time" {...register("scheduledEndHHMM")} />
          </FormField>
        </div>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
