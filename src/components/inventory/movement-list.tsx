"use client";

import { ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { formatMoney } from "@/lib/utils";
import { UNIT_LABEL, formatQty } from "@/lib/inventory/units";
import type { StockMovementRow } from "./types";

const REASON_LABEL = {
  PURCHASE: "Stock in",
  SALE: "Sale",
  WASTAGE: "Wastage",
  ADJUSTMENT: "Adjustment",
  STOCK_TAKE: "Stock-take",
} as const;

const REASON_VARIANT: Record<string, "success" | "info" | "warning" | "neutral" | "danger"> = {
  PURCHASE: "success",
  SALE: "info",
  WASTAGE: "danger",
  ADJUSTMENT: "warning",
  STOCK_TAKE: "neutral",
};

export function MovementList({ movements }: { movements: StockMovementRow[] }) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="No movements yet"
        description="Stock-in, wastage, sales and adjustments will appear here."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-4 py-2 text-left font-medium">When</th>
            <th className="px-4 py-2 text-left font-medium">Reason</th>
            <th className="px-4 py-2 text-left font-medium">Ingredient</th>
            <th className="px-4 py-2 text-right font-medium">Δ</th>
            <th className="px-4 py-2 text-right font-medium">Unit cost</th>
            <th className="px-4 py-2 text-left font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => {
            const isIn = m.deltaQty > 0;
            return (
              <tr key={m.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={REASON_VARIANT[m.reason] ?? "neutral"}>
                    {REASON_LABEL[m.reason]}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{m.ingredientName}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 font-mono ${isIn ? "text-success" : "text-danger"}`}>
                    {isIn ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                    {isIn ? "+" : ""}
                    {m.deltaQty.toFixed(3).replace(/\.?0+$/, "")} {UNIT_LABEL[m.ingredientUnit]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground-muted">
                  {m.unitCostCents > 0 ? formatMoney(m.unitCostCents) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted">
                  {m.wastageReason ? <Badge variant="warning" className="mr-1">{m.wastageReason}</Badge> : null}
                  {m.notes ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
