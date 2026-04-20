"use client";

import * as React from "react";
import {
  Clock,
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/server/actions/menu.actions";
import { cn } from "@/lib/utils";
import type { CategoryRow, ItemRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  categories: CategoryRow[];
  itemsByCategory: ItemRow[];
  onEdit: (cat: CategoryRow) => void;
  onCreateFirst: () => void;
}

function minToHHMM(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function CategoryList({
  slug,
  canManage,
  categories,
  itemsByCategory,
  onEdit,
  onCreateFirst,
}: Props) {
  const { toast } = useToast();
  const [list, setList] = React.useState(categories);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [savingOrder, setSavingOrder] = React.useState(false);

  React.useEffect(() => setList(categories), [categories]);

  const stats = React.useMemo(() => {
    const map = new Map<string, { count: number; photoUrl: string | null }>();
    for (const c of categories) map.set(c.id, { count: 0, photoUrl: null });
    for (const it of itemsByCategory) {
      const s = map.get(it.categoryId);
      if (!s) continue;
      s.count += 1;
      if (!s.photoUrl && it.photoUrl) s.photoUrl = it.photoUrl;
    }
    return map;
  }, [categories, itemsByCategory]);

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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.map((c, i) => {
        const s = stats.get(c.id) ?? { count: 0, photoUrl: null };
        const isDragging = dragId === c.id;
        return (
          <article
            key={c.id}
            draggable={canManage && !savingOrder}
            onDragStart={() => setDragId(c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(c.id)}
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
            className={cn(
              "group relative flex animate-fade-in flex-col overflow-hidden rounded-2xl border bg-background transition-all duration-200",
              isDragging
                ? "scale-95 opacity-40"
                : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
              !c.isActive && "opacity-70",
            )}
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary-subtle to-surface-muted">
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.photoUrl}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-foreground-subtle" />
                </div>
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent"
              />
              {canManage ? (
                <span className="absolute left-2 top-2 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-background/80 text-foreground-muted opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <GripVertical className="h-4 w-4" />
                </span>
              ) : null}
              <span className="absolute right-2 top-2 rounded-full bg-background/95 px-2.5 py-1 font-mono text-xs font-medium shadow-sm backdrop-blur">
                {s.count} item{s.count === 1 ? "" : "s"}
              </span>
              <div className="absolute inset-x-3 bottom-2 text-white">
                <p className="line-clamp-1 text-base font-semibold drop-shadow">{c.name}</p>
                {c.nameUr ? (
                  <p className="line-clamp-1 font-urdu text-xs opacity-80 drop-shadow">{c.nameUr}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={c.isActive ? "success" : "neutral"}>
                  {c.isActive ? "Live" : "Hidden"}
                </Badge>
                {c.scheduledStartMin != null && c.scheduledEndMin != null ? (
                  <Badge variant="info" className="font-mono text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    {minToHHMM(c.scheduledStartMin)}–{minToHHMM(c.scheduledEndMin)}
                  </Badge>
                ) : null}
              </div>
              {canManage ? (
                <div className="flex gap-1">
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
            </div>
          </article>
        );
      })}
    </div>
  );
}
