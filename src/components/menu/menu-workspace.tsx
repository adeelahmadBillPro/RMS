"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryList } from "./category-list";
import { CategoryForm } from "./category-form";
import { ItemGrid } from "./item-grid";
import { ItemForm } from "./item-form";
import type { CategoryRow, ItemRow } from "./types";

type Tab = "categories" | "items";

interface Props {
  slug: string;
  canManage: boolean;
  initialTab: Tab;
  initialCategoryFilter: string | null;
  categories: CategoryRow[];
  items: ItemRow[];
}

export function MenuWorkspace({
  slug,
  canManage,
  initialTab,
  initialCategoryFilter,
  categories,
  items,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    initialCategoryFilter,
  );

  const [createCat, setCreateCat] = React.useState(false);
  const [editCat, setEditCat] = React.useState<CategoryRow | null>(null);

  const [createItem, setCreateItem] = React.useState(false);
  const [editItem, setEditItem] = React.useState<ItemRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <nav className="flex gap-1">
          <TabButton active={tab === "categories"} onClick={() => setTab("categories")}>
            Categories
            <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground-muted">
              {categories.length}
            </span>
          </TabButton>
          <TabButton active={tab === "items"} onClick={() => setTab("items")}>
            Items
            <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground-muted">
              {items.length}
            </span>
          </TabButton>
        </nav>
        {canManage ? (
          tab === "categories" ? (
            <Button size="sm" onClick={() => setCreateCat(true)}>
              <Plus className="h-4 w-4" /> Add category
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setCreateItem(true)}
              disabled={categories.length === 0}
              title={categories.length === 0 ? "Add a category first" : undefined}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          )
        ) : null}
      </div>

      {tab === "categories" ? (
        <CategoryList
          slug={slug}
          canManage={canManage}
          categories={categories}
          onEdit={setEditCat}
          onCreateFirst={() => setCreateCat(true)}
        />
      ) : (
        <ItemGrid
          slug={slug}
          canManage={canManage}
          items={items}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          onEdit={setEditItem}
          onCreateFirst={() => setCreateItem(true)}
        />
      )}

      <Dialog open={createCat} onOpenChange={setCreateCat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>Used to group menu items on the POS and customer menu.</DialogDescription>
          </DialogHeader>
          <CategoryForm
            slug={slug}
            initial={null}
            existingCount={categories.length}
            onDone={() => setCreateCat(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          {editCat ? (
            <CategoryForm
              slug={slug}
              initial={editCat}
              existingCount={categories.length}
              onDone={() => setEditCat(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createItem} onOpenChange={setCreateItem}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add menu item</DialogTitle>
            <DialogDescription>One item, one or more variants, optional modifiers.</DialogDescription>
          </DialogHeader>
          <ItemForm
            slug={slug}
            initial={null}
            categories={categories}
            onDone={() => setCreateItem(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit menu item</DialogTitle>
          </DialogHeader>
          {editItem ? (
            <ItemForm
              slug={slug}
              initial={editItem}
              categories={categories}
              onDone={() => setEditItem(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({
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
      className={`-mb-px flex items-center border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-foreground-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
