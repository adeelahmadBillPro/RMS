"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { stockInSchema, type StockInInput } from "@/lib/validations/inventory.schema";
import { recordStockInAction } from "@/server/actions/inventory.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { UNIT_LABEL } from "@/lib/inventory/units";
import { formatMoney } from "@/lib/utils";
import type { BranchPick, IngredientRow, SupplierRow } from "./types";

interface Props {
  slug: string;
  ingredients: IngredientRow[];
  suppliers: SupplierRow[];
  branches: BranchPick[];
  onDone: () => void;
}

export function StockInForm({ slug, ingredients, suppliers, branches, onDone }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const primary = branches.find((b) => b.isPrimary) ?? branches[0];

  const { register, handleSubmit, control, watch, setError, formState: { errors, isValid } } = useForm<StockInInput>({
    resolver: zodResolver(stockInSchema),
    mode: "onBlur",
    defaultValues: {
      branchId: primary?.id ?? "",
      supplierId: "",
      billNumber: "",
      notes: "",
      items: [{ ingredientId: ingredients[0]?.id ?? "", quantity: 0, unitCostRupees: 0 }],
    },
  });
  const fa = useFieldArray({ control, name: "items" });
  const watched = watch("items");

  const total = watched.reduce((sum, it) => {
    const q = Number(it.quantity ?? 0);
    const c = Number(it.unitCostRupees ?? 0);
    return sum + q * c * 100;
  }, 0);

  async function onSubmit(values: StockInInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await recordStockInAction(slug, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof StockInInput, { message: m });
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: "Stock in recorded" });
    onDone();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
      {serverError ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {serverError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="supplierId">Supplier (optional)</Label>
          <select
            id="supplierId"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            {...register("supplierId")}
          >
            <option value="">— None —</option>
            {suppliers.filter((s) => s.isActive).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FormField>
        <FormField>
          <Label htmlFor="billNumber">Bill / invoice #</Label>
          <Input id="billNumber" {...register("billNumber")} />
        </FormField>
      </div>

      {branches.length > 1 ? (
        <FormField>
          <Label htmlFor="branchId">Branch</Label>
          <select
            id="branchId"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            {...register("branchId")}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.isPrimary ? " · primary" : ""}</option>
            ))}
          </select>
        </FormField>
      ) : null}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Items</h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fa.append({ ingredientId: ingredients[0]?.id ?? "", quantity: 0, unitCostRupees: 0 })}
          >
            <Plus className="h-3 w-3" /> Add row
          </Button>
        </div>
        <ul className="space-y-2">
          {fa.fields.map((row, i) => {
            const ing = ingredients.find((x) => x.id === watched[i]?.ingredientId);
            return (
              <li key={row.id} className="grid grid-cols-12 items-end gap-2 rounded-md border border-border bg-background p-2">
                <div className="col-span-5">
                  <select
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    {...register(`items.${i}.ingredientId` as const)}
                  >
                    {ingredients.filter((x) => x.isActive).map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Qty"
                    className="h-9"
                    {...register(`items.${i}.quantity` as const, { valueAsNumber: true })}
                  />
                  <p className="mt-0.5 text-xs text-foreground-muted">{ing ? UNIT_LABEL[ing.unit] : "—"}</p>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="PKR / unit"
                    className="h-9"
                    {...register(`items.${i}.unitCostRupees` as const, { valueAsNumber: true })}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="col-span-1"
                  disabled={fa.fields.length === 1}
                  onClick={() => fa.remove(i)}
                  aria-label="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center justify-end gap-3 border-t border-border pt-2 text-sm">
          <span className="text-foreground-muted">Total</span>
          <span className="font-mono">{formatMoney(Math.round(total))}</span>
        </div>
        {typeof errors.items?.message === "string" ? (
          <p className="mt-1 text-xs text-danger">{errors.items.message}</p>
        ) : null}
      </div>

      <FormField>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" {...register("notes")} />
      </FormField>

      <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-border bg-background px-1 pt-3">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          Record stock in
        </Button>
      </div>
    </form>
  );
}
