"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { recipeUpsertSchema, type RecipeUpsertInput } from "@/lib/validations/inventory.schema";
import { upsertRecipeAction } from "@/server/actions/recipe.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { formatMoney } from "@/lib/utils";
import { UNIT_LABEL } from "@/lib/inventory/units";
import type { RecipeIngredientPick, RecipeVariantRow } from "./types";

interface Props {
  slug: string;
  variant: RecipeVariantRow;
  priceCents: number;
  ingredients: RecipeIngredientPick[];
  onDone: () => void;
}

export function RecipeEditor({ slug, variant, priceCents, ingredients, onDone }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, control, handleSubmit, watch, setError, formState: { errors, isValid } } = useForm<RecipeUpsertInput>({
    resolver: zodResolver(recipeUpsertSchema),
    mode: "onBlur",
    defaultValues: {
      variantId: variant.id,
      notes: variant.notes ?? "",
      items: variant.items.length > 0
        ? variant.items
        : [{ ingredientId: ingredients[0]?.id ?? "", quantity: 0.001, wastagePercent: 0 }],
    },
  });

  const fa = useFieldArray({ control, name: "items" });
  const watched = watch("items");

  // Live cost-per-plate in paisa
  const liveCostCents = watched.reduce((sum, ri) => {
    const ing = ingredients.find((x) => x.id === ri.ingredientId);
    if (!ing) return sum;
    const qty = Number(ri.quantity ?? 0);
    const wastage = 1 + Number(ri.wastagePercent ?? 0) / 100;
    return sum + qty * ing.avgCostCents * wastage;
  }, 0);
  const liveCostRounded = Math.round(liveCostCents);
  const margin = priceCents > 0 ? ((priceCents - liveCostRounded) / priceCents) * 100 : 0;
  const isLoss = liveCostRounded > priceCents && liveCostRounded > 0;

  async function onSubmit(values: RecipeUpsertInput) {
    setSubmitting(true);
    setServerError(null);
    const res = await upsertRecipeAction(slug, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof RecipeUpsertInput, { message: m });
      }
      setSubmitting(false);
      return;
    }
    toast({
      variant: "success",
      title: "Recipe saved",
      description: `Cost: ${formatMoney(res.data.costCents)} per plate`,
    });
    onDone();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
      {serverError ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {serverError}
        </div>
      ) : null}

      <input type="hidden" {...register("variantId")} />

      <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface p-3 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Sells for</p>
          <p className="mt-1 font-mono text-h3">{formatMoney(priceCents)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Costs</p>
          <p className="mt-1 font-mono text-h3">{formatMoney(liveCostRounded)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Margin</p>
          <p className={`mt-1 font-mono text-h3 ${isLoss ? "text-danger" : margin < 30 ? "text-warning" : "text-success"}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Ingredients</h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fa.append({ ingredientId: ingredients[0]?.id ?? "", quantity: 0.001, wastagePercent: 0 })}
          >
            <Plus className="h-3 w-3" /> Add
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
                    {ingredients.map((x) => (
                      <option key={x.id} value={x.id}>{x.name} ({UNIT_LABEL[x.unit]})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    placeholder="Qty"
                    className="h-9"
                    {...register(`items.${i}.quantity` as const, { valueAsNumber: true })}
                  />
                  {ing ? <p className="mt-0.5 text-xs text-foreground-muted">{UNIT_LABEL[ing.unit]} @ {formatMoney(ing.avgCostCents)}/{UNIT_LABEL[ing.unit]}</p> : null}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    placeholder="Waste %"
                    className="h-9"
                    {...register(`items.${i}.wastagePercent` as const, { valueAsNumber: true })}
                  />
                  <p className="mt-0.5 text-xs text-foreground-muted">e.g. 5</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="col-span-1"
                  onClick={() => fa.remove(i)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
        {typeof errors.items?.message === "string" ? (
          <p className="mt-2 text-xs text-danger">{errors.items.message}</p>
        ) : null}
      </div>

      <FormField>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" {...register("notes")} />
      </FormField>

      <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-border bg-background px-1 pt-3">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          Save recipe
        </Button>
      </div>
    </form>
  );
}
