"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, ChefHat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { RecipeEditor } from "./recipe-editor";
import type { RecipeIngredientPick, RecipeItemMenuRow, RecipeVariantRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  items: RecipeItemMenuRow[];
  ingredients: RecipeIngredientPick[];
}

export function RecipesWorkspace({ slug, canManage, items, ingredients }: Props) {
  const [editing, setEditing] = React.useState<{
    item: RecipeItemMenuRow;
    variant: RecipeVariantRow;
  } | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(items.map((i) => i.id)));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const isExpanded = expanded.has(it.id);
        return (
          <div key={it.id} className="overflow-hidden rounded-xl border border-border bg-surface">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-surface-muted"
              onClick={() => toggle(it.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">{it.name}</span>
                <span className="text-xs text-foreground-muted">{it.categoryName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                {it.variants.length} variant{it.variants.length === 1 ? "" : "s"}
              </div>
            </button>
            {isExpanded ? (
              <div className="border-t border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-muted/40 text-xs uppercase tracking-wide text-foreground-muted">
                      <th className="px-4 py-2 text-left font-medium">Variant</th>
                      <th className="px-4 py-2 text-right font-medium">Sell price</th>
                      <th className="px-4 py-2 text-right font-medium">Cost / plate</th>
                      <th className="px-4 py-2 text-right font-medium">Margin</th>
                      <th className="px-4 py-2 text-left font-medium">Recipe</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {it.variants.map((v) => {
                      const cost = v.cachedCostCents;
                      const margin = v.priceCents > 0 ? Math.round(((v.priceCents - cost) / v.priceCents) * 1000) / 10 : 0;
                      const isLoss = cost > v.priceCents && cost > 0;
                      return (
                        <tr key={v.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">
                            {v.name}
                            {v.isDefault ? <Badge variant="primary" className="ml-2">default</Badge> : null}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatMoney(v.priceCents)}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            {v.recipeId ? formatMoney(cost) : <span className="text-foreground-subtle">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {v.recipeId ? (
                              <span className={isLoss ? "text-danger" : margin < 30 ? "text-warning" : "text-success"}>
                                {margin.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-foreground-subtle">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground-muted">
                            {v.recipeId ? `${v.items.length} ingredient${v.items.length === 1 ? "" : "s"}` : <span className="text-foreground-subtle">No recipe</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManage ? (
                              <Button size="sm" variant="ghost" onClick={() => setEditing({ item: it, variant: v })}>
                                {v.recipeId ? "Edit recipe" : "Add recipe"}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        );
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                {editing ? `${editing.item.name} · ${editing.variant.name}` : ""}
              </span>
            </DialogTitle>
            <DialogDescription>
              Cost-per-plate updates live as you tweak quantities.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <RecipeEditor
              slug={slug}
              variant={editing.variant}
              priceCents={editing.variant.priceCents}
              ingredients={ingredients}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
