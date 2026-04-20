"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ingredientCreateSchema,
  ingredientUpdateSchema,
  type IngredientCreateInput,
  type IngredientUpdateInput,
} from "@/lib/validations/inventory.schema";
import {
  createIngredientAction,
  updateIngredientAction,
} from "@/server/actions/inventory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { UNIT_OPTIONS } from "@/lib/inventory/units";
import type { IngredientRow, SupplierRow } from "./types";

interface Props {
  slug: string;
  initial: IngredientRow | null;
  suppliers: SupplierRow[];
  onDone: () => void;
}

export function IngredientForm({ slug, initial, suppliers, onDone }: Props) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // FormShape is the superset (create) so access to openingStock/openingCostRupees
  // is always typed. On edit, these fields are simply unused on the server side.
  type FormShape = IngredientCreateInput & { id?: string };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? ingredientUpdateSchema : ingredientCreateSchema) as never,
    mode: "onBlur",
    defaultValues: isEdit
      ? {
          id: initial!.id,
          name: initial!.name,
          unit: initial!.unit,
          reorderLevel: initial!.reorderLevel,
          openingStock: 0,
          openingCostRupees: initial!.avgCostCents / 100,
          supplierId: initial!.supplierId ?? "",
          isActive: initial!.isActive,
        }
      : {
          name: "",
          unit: "G",
          reorderLevel: 0,
          openingStock: 0,
          openingCostRupees: 0,
          supplierId: "",
          isActive: true,
        },
  });

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const res = isEdit
      ? await updateIngredientAction(slug, values as IngredientUpdateInput)
      : await createIngredientAction(slug, values as IngredientCreateInput);
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
    toast({ variant: "success", title: isEdit ? "Ingredient updated" : "Ingredient added" });
    onDone();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {serverError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" invalid={!!errors.name} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="unit" required>Unit</Label>
          <select
            id="unit"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            {...register("unit")}
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <FieldError message={errors.unit?.message} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="reorderLevel">Reorder level</Label>
        <Input
          id="reorderLevel"
          type="number"
          step="0.001"
          min="0"
          invalid={!!errors.reorderLevel}
          {...register("reorderLevel", { valueAsNumber: true })}
        />
        <FieldHint>Show a low-stock alert when current stock falls to or below this.</FieldHint>
        <FieldError message={errors.reorderLevel?.message} />
      </FormField>

      {!isEdit ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField>
            <Label htmlFor="openingStock">Opening stock (optional)</Label>
            <Input
              id="openingStock"
              type="number"
              step="0.001"
              min="0"
              {...register("openingStock", { valueAsNumber: true })}
            />
            <FieldError message={errors.openingStock?.message} />
          </FormField>
          <FormField>
            <Label htmlFor="openingCostRupees">Cost per unit (PKR)</Label>
            <Input
              id="openingCostRupees"
              type="number"
              step="0.01"
              min="0"
              {...register("openingCostRupees", { valueAsNumber: true })}
            />
            <FieldHint>Updated automatically by future stock-in entries.</FieldHint>
            <FieldError message={errors.openingCostRupees?.message} />
          </FormField>
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="supplierId">Supplier (optional)</Label>
        <select
          id="supplierId"
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          {...register("supplierId")}
        >
          <option value="">— No supplier —</option>
          {suppliers.filter((s) => s.isActive).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" {...register("isActive")} />
        <span>Active</span>
      </label>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Add ingredient"}
        </Button>
      </div>
    </form>
  );
}
