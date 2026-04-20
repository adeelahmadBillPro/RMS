"use client";

import {
  AlertTriangle,
  Beef,
  CupSoda,
  Egg,
  Fish,
  Leaf,
  Milk,
  PackageSearch,
  Pencil,
  Pizza,
  Salad,
  Trash2,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { deleteIngredientAction } from "@/server/actions/inventory.actions";
import { cn, formatMoney } from "@/lib/utils";
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

/** Pick a sensible lucide icon by keyword in the ingredient name. */
function iconForIngredient(name: string) {
  const n = name.toLowerCase();
  if (n.includes("chicken") || n.includes("beef") || n.includes("meat") || n.includes("patty")) return Beef;
  if (n.includes("fish") || n.includes("salmon") || n.includes("tuna")) return Fish;
  if (n.includes("bun") || n.includes("bread") || n.includes("flour") || n.includes("rice") || n.includes("tortilla") || n.includes("wheat")) return Wheat;
  if (n.includes("egg")) return Egg;
  if (n.includes("cheese") || n.includes("milk") || n.includes("cream") || n.includes("yogurt")) return Milk;
  if (n.includes("lettuce") || n.includes("basil") || n.includes("herb") || n.includes("mint") || n.includes("spinach")) return Leaf;
  if (n.includes("potato") || n.includes("onion") || n.includes("tomato") || n.includes("salad") || n.includes("veg")) return Salad;
  if (n.includes("coke") || n.includes("cola") || n.includes("pepsi") || n.includes("drink") || n.includes("sprite") || n.includes("juice") || n.includes("soda")) return CupSoda;
  if (n.includes("pizza")) return Pizza;
  return PackageSearch;
}

export function IngredientList({
  slug,
  canManage,
  canDelete,
  ingredients,
  onEdit,
  onCreateFirst,
}: Props) {
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
    <div className="space-y-2">
      {ingredients.map((i, idx) => {
        const Icon = iconForIngredient(i.name);
        const hasReorder = i.reorderLevel > 0;
        // Normalise the bar: 0% when empty, 100% at 2x reorder level. Low = red, ok = amber, good = green.
        const benchmark = hasReorder ? i.reorderLevel * 2 : Math.max(i.currentStock, 1);
        const pct = Math.min(100, Math.max(0, Math.round((i.currentStock / benchmark) * 100)));
        const state = !hasReorder
          ? "neutral"
          : i.currentStock === 0
            ? "empty"
            : i.currentStock <= i.reorderLevel
              ? "low"
              : i.currentStock <= i.reorderLevel * 1.5
                ? "ok"
                : "good";
        const stateBar: Record<string, string> = {
          neutral: "bg-foreground-subtle",
          empty: "bg-danger",
          low: "bg-warning",
          ok: "bg-primary",
          good: "bg-success",
        };
        const stateIconBg: Record<string, string> = {
          neutral: "bg-surface-muted text-foreground-muted",
          empty: "bg-danger-subtle text-danger",
          low: "bg-warning-subtle text-warning",
          ok: "bg-primary-subtle text-primary",
          good: "bg-success-subtle text-success",
        };
        return (
          <article
            key={i.id}
            style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
            className={cn(
              "group flex animate-fade-in items-center gap-3 rounded-2xl border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm md:p-4",
              state === "low" || state === "empty"
                ? "border-warning/60"
                : "border-border hover:border-primary/40",
              !i.isActive && "opacity-60",
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                stateIconBg[state],
              )}
            >
              <Icon className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{i.name}</p>
                {state === "empty" ? (
                  <Badge variant="danger" pulse>
                    <AlertTriangle className="mr-1 h-3 w-3" /> Out
                  </Badge>
                ) : state === "low" ? (
                  <Badge variant="warning" pulse>Low stock</Badge>
                ) : null}
                {!i.isActive ? <Badge variant="neutral">Inactive</Badge> : null}
                {i.supplierName ? (
                  <span className="truncate text-xs text-foreground-muted">· {i.supplierName}</span>
                ) : null}
              </div>
              {/* Stock bar */}
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", stateBar[state])}
                    style={{ width: `${pct}%` }}
                  />
                  {hasReorder ? (
                    <span
                      aria-hidden
                      title="Reorder threshold"
                      className="absolute inset-y-0 w-px bg-foreground/30"
                      style={{ left: `${Math.min(100, Math.round((i.reorderLevel / benchmark) * 100))}%` }}
                    />
                  ) : null}
                </div>
                <p className="font-mono text-xs text-foreground">
                  <span className="font-semibold">{formatQty(i.currentStock, i.unit)}</span>
                  {hasReorder ? (
                    <span className="ml-1 text-foreground-muted">
                      / {formatQty(i.reorderLevel, i.unit)} reorder
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="hidden text-right md:block">
              <p className="font-mono text-xs text-foreground-muted">Avg cost</p>
              <p className="font-mono text-sm font-semibold">
                {formatMoney(i.avgCostCents)}
                <span className="ml-1 text-xs font-normal text-foreground-subtle">
                  / {UNIT_LABEL[i.unit]}
                </span>
              </p>
            </div>

            {canManage ? (
              <div className="flex flex-shrink-0 gap-1">
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
          </article>
        );
      })}
    </div>
  );
}
