"use client";

import * as React from "react";
import { Plus, PackagePlus, Trash, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { IngredientList } from "./ingredient-list";
import { IngredientForm } from "./ingredient-form";
import { SupplierList } from "./supplier-list";
import { SupplierForm } from "./supplier-form";
import { MovementList } from "./movement-list";
import { StockInForm } from "./stock-in-form";
import { WastageForm } from "./wastage-form";
import type { BranchPick, IngredientRow, StockMovementRow, SupplierRow } from "./types";

type Tab = "ingredients" | "movements" | "suppliers";

interface Props {
  slug: string;
  canManage: boolean;
  canDelete: boolean;
  initialTab: Tab;
  ingredients: IngredientRow[];
  suppliers: SupplierRow[];
  branches: BranchPick[];
  movements: StockMovementRow[];
}

export function InventoryWorkspace({
  slug,
  canManage,
  canDelete,
  initialTab,
  ingredients,
  suppliers,
  branches,
  movements,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(initialTab);
  const [createIngredient, setCreateIngredient] = React.useState(false);
  const [editIngredient, setEditIngredient] = React.useState<IngredientRow | null>(null);
  const [createSupplier, setCreateSupplier] = React.useState(false);
  const [editSupplier, setEditSupplier] = React.useState<SupplierRow | null>(null);
  const [stockIn, setStockIn] = React.useState(false);
  const [logWastage, setLogWastage] = React.useState(false);

  const lowStock = ingredients.filter(
    (i) => i.isActive && i.reorderLevel > 0 && i.currentStock <= i.reorderLevel,
  );

  return (
    <div className="space-y-4">
      {lowStock.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning bg-warning-subtle p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">{lowStock.length} ingredient(s) at or below reorder level</p>
            <p className="text-xs text-foreground-muted">{lowStock.slice(0, 5).map((i) => i.name).join(", ")}{lowStock.length > 5 ? ", …" : ""}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <nav className="flex gap-1">
          <TabButton active={tab === "ingredients"} onClick={() => setTab("ingredients")}>
            Ingredients
            <Count value={ingredients.length} />
          </TabButton>
          <TabButton active={tab === "movements"} onClick={() => setTab("movements")}>
            Movements
            <Count value={movements.length} />
          </TabButton>
          <TabButton active={tab === "suppliers"} onClick={() => setTab("suppliers")}>
            Suppliers
            <Count value={suppliers.length} />
          </TabButton>
        </nav>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {tab === "ingredients" || tab === "movements" ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setLogWastage(true)} disabled={ingredients.length === 0}>
                  <Trash className="h-4 w-4" /> Wastage
                </Button>
                <Button size="sm" onClick={() => setStockIn(true)} disabled={ingredients.length === 0}>
                  <PackagePlus className="h-4 w-4" /> Stock in
                </Button>
                {tab === "ingredients" ? (
                  <Button size="sm" onClick={() => setCreateIngredient(true)}>
                    <Plus className="h-4 w-4" /> Ingredient
                  </Button>
                ) : null}
              </>
            ) : (
              <Button size="sm" onClick={() => setCreateSupplier(true)}>
                <Plus className="h-4 w-4" /> Supplier
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {tab === "ingredients" ? (
        <IngredientList
          slug={slug}
          canManage={canManage}
          canDelete={canDelete}
          ingredients={ingredients}
          onEdit={setEditIngredient}
          onCreateFirst={() => setCreateIngredient(true)}
        />
      ) : tab === "movements" ? (
        <MovementList movements={movements} />
      ) : (
        <SupplierList
          slug={slug}
          canManage={canManage}
          suppliers={suppliers}
          onEdit={setEditSupplier}
          onCreateFirst={() => setCreateSupplier(true)}
        />
      )}

      <Dialog open={createIngredient} onOpenChange={setCreateIngredient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add ingredient</DialogTitle>
            <DialogDescription>
              Optional opening stock will be recorded as a stock-take movement.
            </DialogDescription>
          </DialogHeader>
          <IngredientForm slug={slug} initial={null} suppliers={suppliers} onDone={() => setCreateIngredient(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editIngredient} onOpenChange={(o) => !o && setEditIngredient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ingredient</DialogTitle>
            <DialogDescription>
              Stock and avg cost are managed via Stock In / Wastage / Stock-take.
            </DialogDescription>
          </DialogHeader>
          {editIngredient ? (
            <IngredientForm
              slug={slug}
              initial={editIngredient}
              suppliers={suppliers}
              onDone={() => setEditIngredient(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={createSupplier} onOpenChange={setCreateSupplier}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add supplier</DialogTitle>
          </DialogHeader>
          <SupplierForm slug={slug} initial={null} onDone={() => setCreateSupplier(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplier} onOpenChange={(o) => !o && setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit supplier</DialogTitle>
          </DialogHeader>
          {editSupplier ? (
            <SupplierForm slug={slug} initial={editSupplier} onDone={() => setEditSupplier(null)} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={stockIn} onOpenChange={setStockIn}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record stock in</DialogTitle>
            <DialogDescription>Updates current stock and weighted-average cost.</DialogDescription>
          </DialogHeader>
          <StockInForm
            slug={slug}
            ingredients={ingredients}
            suppliers={suppliers}
            branches={branches}
            onDone={() => setStockIn(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={logWastage} onOpenChange={setLogWastage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log wastage</DialogTitle>
            <DialogDescription>Reduces stock; cost flows to your reports.</DialogDescription>
          </DialogHeader>
          <WastageForm
            slug={slug}
            ingredients={ingredients}
            branches={branches}
            onDone={() => setLogWastage(false)}
          />
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

function Count({ value }: { value: number }) {
  return (
    <span className="ml-2 rounded-full bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground-muted">
      {value}
    </span>
  );
}
