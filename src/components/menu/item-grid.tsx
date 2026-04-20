"use client";

import * as React from "react";
import { Image as ImageIcon, Pencil, Trash2, Eye, EyeOff, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteItemAction,
  toggleItemAvailabilityAction,
} from "@/server/actions/menu.actions";
import { formatMoney } from "@/lib/utils";
import type { CategoryRow, ItemRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  items: ItemRow[];
  categories: CategoryRow[];
  categoryFilter: string | null;
  onCategoryFilter: (id: string | null) => void;
  onEdit: (item: ItemRow) => void;
  onCreateFirst: () => void;
}

export function ItemGrid({
  slug,
  canManage,
  items,
  categories,
  categoryFilter,
  onCategoryFilter,
  onEdit,
  onCreateFirst,
}: Props) {
  const { toast } = useToast();
  const filtered = categoryFilter ? items.filter((it) => it.categoryId === categoryFilter) : items;

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-5 w-5" />}
        title="Add a category first"
        description="Items belong to categories. Switch to the Categories tab to add one."
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-5 w-5" />}
        title="No items yet"
        description="Add your first menu item to start taking orders."
        action={canManage ? <Button onClick={onCreateFirst}>Add first item</Button> : null}
      />
    );
  }

  async function handleDelete(it: ItemRow) {
    if (!confirm(`Delete “${it.name}”?`)) return;
    const res = await deleteItemAction(slug, { id: it.id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
    else toast({ variant: "success", title: "Item deleted" });
  }
  async function toggleAvail(it: ItemRow) {
    const res = await toggleItemAvailabilityAction(slug, { id: it.id, isAvailable: !it.isAvailable });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t update", description: res.error });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={categoryFilter == null} onClick={() => onCategoryFilter(null)}>
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={categoryFilter === c.id}
            onClick={() => onCategoryFilter(c.id)}
          >
            {c.name}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => {
          const def = it.variants.find((v) => v.isDefault) ?? it.variants[0];
          return (
            <div
              key={it.id}
              className={`flex flex-col rounded-xl border bg-surface p-3 transition-colors ${
                it.isAvailable ? "border-border hover:border-border-strong" : "border-dashed border-border opacity-70"
              }`}
            >
              <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                {it.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photoUrl} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-foreground-subtle" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-tight">{it.name}</h3>
                  {!it.isAvailable ? <Badge variant="warning">86’d</Badge> : null}
                </div>
                <p className="text-xs text-foreground-muted">{it.categoryName}</p>
                {def ? (
                  <p className="font-mono text-sm">
                    {formatMoney(def.priceCents)}
                    {it.variants.length > 1 ? (
                      <span className="ml-1 text-xs text-foreground-subtle">+{it.variants.length - 1}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {canManage ? (
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={it.isAvailable ? "Mark unavailable" : "Mark available"}
                    onClick={() => toggleAvail(it)}
                  >
                    {it.isAvailable ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Edit item" onClick={() => onEdit(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete item"
                    onClick={() => handleDelete(it)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-5 w-5" />}
          title="Nothing in this category"
          description="Try another category, or add an item."
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-muted text-foreground-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
