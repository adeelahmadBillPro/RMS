"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  branchCreateSchema,
  branchUpdateSchema,
  type BranchCreateInput,
  type BranchUpdateInput,
} from "@/lib/validations/branch.schema";
import { createBranchAction, updateBranchAction } from "@/server/actions/branch.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";

export type BranchFormValues = {
  id?: string;
  name: string;
  address: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive?: boolean;
  taxBps: number;
  serviceBps: number;
};

interface Props {
  slug: string;
  initial?: BranchFormValues;
  onDone?: () => void;
}

export function BranchForm({ slug, initial, onDone }: Props) {
  const isEdit = !!initial?.id;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  type FormShape = BranchCreateInput & { id?: string; isActive?: boolean };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? branchUpdateSchema : branchCreateSchema),
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      name: initial?.name ?? "",
      address: initial?.address ?? "",
      phone: initial?.phone ?? "",
      isPrimary: initial?.isPrimary ?? false,
      isActive: initial?.isActive ?? true,
      taxBps: initial?.taxBps ?? 0,
      serviceBps: initial?.serviceBps ?? 0,
    },
  });

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const action = isEdit ? updateBranchAction : createBranchAction;
    const payload = isEdit
      ? (values as BranchUpdateInput)
      : (values as BranchCreateInput);
    const res = await action(slug, payload);
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
    toast({
      variant: "success",
      title: isEdit ? "Branch updated" : "Branch created",
    });
    onDone?.();
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
        <Label htmlFor="name" required>
          Branch name
        </Label>
        <Input id="name" invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="address">Address</Label>
        <Input id="address" invalid={!!errors.address} {...register("address")} />
        <FieldError message={errors.address?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" placeholder="03001234567" invalid={!!errors.phone} {...register("phone")} />
        <FieldError message={errors.phone?.message} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField>
          <Label htmlFor="taxBps">Tax (%)</Label>
          <Input
            id="taxBps"
            type="number"
            step="1"
            invalid={!!errors.taxBps}
            {...register("taxBps", {
              setValueAs: (v) => Math.round(Number(v) * 100),
            })}
            defaultValue={initial?.taxBps ? initial.taxBps / 100 : 0}
          />
          <FieldHint>Whole percent, e.g. 17 for 17% GST.</FieldHint>
          <FieldError message={errors.taxBps?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="serviceBps">Service (%)</Label>
          <Input
            id="serviceBps"
            type="number"
            step="1"
            invalid={!!errors.serviceBps}
            {...register("serviceBps", {
              setValueAs: (v) => Math.round(Number(v) * 100),
            })}
            defaultValue={initial?.serviceBps ? initial.serviceBps / 100 : 0}
          />
          <FieldError message={errors.serviceBps?.message} />
        </FormField>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("isPrimary")}
        />
        <span>
          <span className="font-medium">Primary branch</span>
          <span className="block text-xs text-foreground-muted">
            POS, KDS and inventory default to this branch.
          </span>
        </span>
      </label>

      {isEdit ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            {...register("isActive")}
          />
          <span>
            <span className="font-medium">Active</span>
            <span className="block text-xs text-foreground-muted">
              Inactive branches stay in reports but can’t take new orders.
            </span>
          </span>
        </label>
      ) : null}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Create branch"}
        </Button>
      </div>
    </form>
  );
}
