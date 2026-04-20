"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { wastageLogSchema, type WastageLogInput } from "@/lib/validations/inventory.schema";
import { logWastageAction } from "@/server/actions/inventory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { UNIT_LABEL } from "@/lib/inventory/units";
import type { BranchPick, IngredientRow } from "./types";

interface Props {
  slug: string;
  ingredients: IngredientRow[];
  branches: BranchPick[];
  onDone: () => void;
}

const REASONS: { value: WastageLogInput["reason"]; label: string }[] = [
  { value: "SPOILAGE", label: "Spoilage" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "THEFT", label: "Theft" },
  { value: "TRAINING", label: "Training" },
  { value: "OTHER", label: "Other" },
];

export function WastageForm({ slug, ingredients, branches, onDone }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const primary = branches.find((b) => b.isPrimary) ?? branches[0];

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isValid },
  } = useForm<WastageLogInput>({
    resolver: zodResolver(wastageLogSchema),
    mode: "onBlur",
    defaultValues: {
      branchId: primary?.id ?? "",
      ingredientId: ingredients[0]?.id ?? "",
      quantity: 0,
      reason: "SPOILAGE",
      notes: "",
    },
  });
  const ingId = watch("ingredientId");
  const ing = ingredients.find((x) => x.id === ingId);

  async function onSubmit(values: WastageLogInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await logWastageAction(slug, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof WastageLogInput, { message: m });
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: "Wastage logged" });
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
        <Label htmlFor="ingredientId" required>Ingredient</Label>
        <select
          id="ingredientId"
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          {...register("ingredientId")}
        >
          {ingredients.filter((x) => x.isActive).map((x) => (
            <option key={x.id} value={x.id}>{x.name} ({UNIT_LABEL[x.unit]})</option>
          ))}
        </select>
        <FieldError message={errors.ingredientId?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="quantity" required>
          Quantity {ing ? <span className="text-xs text-foreground-muted">({UNIT_LABEL[ing.unit]}, max {ing.currentStock})</span> : null}
        </Label>
        <Input
          id="quantity"
          type="number"
          step="0.001"
          min="0"
          invalid={!!errors.quantity}
          {...register("quantity", { valueAsNumber: true })}
        />
        <FieldError message={errors.quantity?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="reason" required>Reason</Label>
        <select
          id="reason"
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          {...register("reason")}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </FormField>

      <FormField>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" {...register("notes")} />
      </FormField>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" variant="destructive" loading={submitting} disabled={!isValid}>
          Log wastage
        </Button>
      </div>
    </form>
  );
}
