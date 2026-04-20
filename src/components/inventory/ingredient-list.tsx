"use client";

import { Pencil, PackageSearch, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { deleteIngredientAction } from "@/server/actions/inventory.actions";
import { formatMoney } from "@/lib/utils";
import { UNIT_LABEL, formatQty } from "@/lib/inventory/units";
import type { IngredientRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  canDelete: boolean;
  ingredients: IngredientRow[];
  onEdit: (i: IngredientRow) => void;
  onCreateFirst: () => void;
}

export function IngredientList({ slug, canManage, canDelete, ingredients, onEdit, onCreateFirst }: Props) {
  const { toast } = useToast();

  if (ingredients.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch className="h-5 w-5" />}
        title="No ingredients yet"
        description="Add ingredients to track stock and compute cost-per-plate."
        action={canManage ? <Button onClick={onCreateFirst}>Add first ingredient</Button> : null}
      />
    );
  }

  async function handleDelete(i: IngredientRow) {
    if (!confirm(`Delete ingredient “${i.name}”?`)) return;
    const res = await deleteIngredientAction(slug, { id: i.id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
    else toast({ variant: "success", title: "Deleted" });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Unit</th>
            <th className="px-4 py-2 text-right font-medium">Stock</th>
            <th className="px-4 py-2 text-right font-medium">Reorder at</th>
            <th className="px-4 py-2 text-right font-medium">Avg cost</th>
            <th className="px-4 py-2 text-left font-medium">Supplier</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((i) => {
            const lowStock = i.reorderLevel > 0 && i.currentStock <= i.reorderLevel;
            return (
              <tr key={i.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {i.name}
                    {lowStock ? <Badge variant="warning">Low</Badge> : null}
                    {!i.isActive ? <Badge variant="neutral">Inactive</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground-muted">{UNIT_LABEL[i.unit]}</td>
                <td className="px-4 py-3 text-right font-mono">{formatQty(i.currentStock, i.unit)}</td>
                <td className="px-4 py-3 text-right font-mono text-foreground-muted">
                  {i.reorderLevel > 0 ? formatQty(i.reorderLevel, i.unit) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(i.avgCostCents)}/{UNIT_LABEL[i.unit]}</td>
                <td className="px-4 py-3 text-foreground-muted">{i.supplierName ?? "—"}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete ? (
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => handleDelete(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
