"use client";

import * as React from "react";
import { GripVertical, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/server/actions/menu.actions";
import type { CategoryRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  categories: CategoryRow[];
  onEdit: (cat: CategoryRow) => void;
  onCreateFirst: () => void;
}

export function CategoryList({ slug, canManage, categories, onEdit, onCreateFirst }: Props) {
  const { toast } = useToast();
  const [list, setList] = React.useState(categories);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [savingOrder, setSavingOrder] = React.useState(false);

  React.useEffect(() => setList(categories), [categories]);

  if (list.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-5 w-5" />}
        title="No categories yet"
        description="Categories group your items on the POS, KDS and customer menu."
        action={canManage ? <Button onClick={onCreateFirst}>Add your first category</Button> : null}
      />
    );
  }

  async function commitOrder(next: CategoryRow[]) {
    setSavingOrder(true);
    const res = await reorderCategoriesAction(slug, { ids: next.map((c) => c.id) });
    setSavingOrder(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t reorder", description: res.error });
      setList(categories);
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const fromIdx = list.findIndex((c) => c.id === dragId);
    const toIdx = list.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...list];
    const [moved] = next.splice(fromIdx, 1);
    if (moved) next.splice(toIdx, 0, moved);
    setList(next);
    setDragId(null);
    void commitOrder(next);
  }

  async function handleDelete(c: CategoryRow) {
    if (!confirm(`Delete category “${c.name}”?`)) return;
    const res = await deleteCategoryAction(slug, { id: c.id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
    else toast({ variant: "success", title: "Category deleted" });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <th className="w-8 px-2 py-2"></th>
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Schedule</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr
              key={c.id}
              draggable={canManage && !savingOrder}
              onDragStart={() => setDragId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(c.id)}
              className={`border-t border-border transition-colors ${
                dragId === c.id ? "opacity-50" : "hover:bg-surface-muted"
              }`}
            >
              <td className="px-2 py-3 text-foreground-subtle">
                {canManage ? <GripVertical className="h-4 w-4 cursor-grab" /> : null}
              </td>
              <td className="px-4 py-3 font-medium">
                {c.name}
                {c.nameUr ? (
                  <span className="ml-2 font-urdu text-foreground-muted">{c.nameUr}</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.isActive ? "success" : "neutral"}>
                  {c.isActive ? "Active" : "Hidden"}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                {c.scheduledStartMin != null && c.scheduledEndMin != null
                  ? `${minToHHMM(c.scheduledStartMin)} – ${minToHHMM(c.scheduledEndMin)}`
                  : "All day"}
              </td>
              <td className="px-4 py-3">
                {canManage ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit category"
                      onClick={() => onEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete category"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
