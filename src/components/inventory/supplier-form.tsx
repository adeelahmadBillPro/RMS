"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  supplierCreateSchema,
  supplierUpdateSchema,
  type SupplierCreateInput,
} from "@/lib/validations/inventory.schema";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/server/actions/inventory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import type { SupplierRow } from "./types";

interface Props {
  slug: string;
  initial: SupplierRow | null;
  onDone: () => void;
}

export function SupplierForm({ slug, initial, onDone }: Props) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  type FormShape = SupplierCreateInput & { id?: string };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? supplierUpdateSchema : supplierCreateSchema),
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      contactName: initial?.contactName ?? "",
      phone: initial?.phone ?? "",
      notes: initial?.notes ?? "",
      isActive: initial?.isActive ?? true,
    },
  });

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const res = isEdit
      ? await updateSupplierAction(slug, values)
      : await createSupplierAction(slug, values);
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
    toast({ variant: "success", title: isEdit ? "Supplier updated" : "Supplier added" });
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
        <Label htmlFor="name" required>Name</Label>
        <Input id="name" invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="contactName">Contact person</Label>
          <Input id="contactName" {...register("contactName")} />
        </FormField>
        <FormField>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="03001234567" invalid={!!errors.phone} {...register("phone")} />
          <FieldError message={errors.phone?.message} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" {...register("notes")} />
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" {...register("isActive")} />
        <span>Active</span>
      </label>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Add supplier"}
        </Button>
      </div>
    </form>
  );
}
