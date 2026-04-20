"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Beef,
  Coffee,
  IceCream,
  Image as ImageIcon,
  LayoutGrid,
  Menu as MenuIcon,
  Minus,
  Percent,
  Pizza,
  Plus,
  Receipt,
  Salad,
  Sandwich,
  Search,
  ShoppingBag,
  Soup,
  StickyNote,
  Table2,
  Trash2,
  Truck,
  User,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createOrderAction } from "@/server/actions/order.actions";
import { computeTotals, lineKey, type CartLine } from "@/lib/orders/cart";
import { cn, formatMoney, rupeesToPaisa } from "@/lib/utils";
import type { BranchPick, CategoryPick, ItemPick, TablePick } from "./types";

type Channel = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

interface Props {
  slug: string;
  tenantName: string;
  hasDelivery: boolean;
  hasTakeaway: boolean;
  branches: BranchPick[];
  categories: CategoryPick[];
  items: ItemPick[];
  tables: TablePick[];
}

/** Map a category name to a reasonable Lucide icon by keyword. */
function iconForCategory(name: string) {
  const n = name.toLowerCase();
  if (n.includes("burger") || n.includes("beef") || n.includes("steak")) return Beef;
  if (n.includes("wrap") || n.includes("shawarma") || n.includes("sandwich")) return Sandwich;
  if (n.includes("pizza")) return Pizza;
  if (n.includes("side") || n.includes("salad") || n.includes("fries")) return Salad;
  if (n.includes("drink") || n.includes("coffee") || n.includes("tea") || n.includes("juice"))
    return Coffee;
  if (n.includes("dessert") || n.includes("sweet") || n.includes("ice")) return IceCream;
  if (n.includes("soup")) return Soup;
  return UtensilsCrossed;
}

export function POSScreen({
  slug,
  tenantName,
  hasDelivery,
  hasTakeaway,
  branches,
  categories,
  items,
  tables,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const primaryBranch = branches.find((b) => b.isPrimary) ?? branches[0]!;
  const [branchId, setBranchId] = React.useState(primaryBranch.id);
  const branch = branches.find((b) => b.id === branchId)!;
  const branchTables = tables.filter((t) => t.branchId === branchId);

  const [channel, setChannel] = React.useState<Channel>("DINE_IN");
  const [tableId, setTableId] = React.useState<string>("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [discountRupees, setDiscountRupees] = React.useState(0);
  const [tipRupees, setTipRupees] = React.useState(0);
  const [deliveryRupees, setDeliveryRupees] = React.useState(0);
  const [orderNotes, setOrderNotes] = React.useState("");

  // "all" sentinel plus real category IDs
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const [picker, setPicker] = React.useState<ItemPick | null>(null);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Quick-action popovers
  const [openPopover, setOpenPopover] = React.useState<
    "customer" | "tables" | "discount" | "notes" | null
  >(null);

  const filtered = React.useMemo(() => {
    const byCat =
      activeCategory === "all"
        ? items
        : items.filter((i) => i.categoryId === activeCategory);
    if (!query.trim()) return byCat;
    const q = query.trim().toLowerCase();
    return byCat.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.variants.some((v) => v.name.toLowerCase().includes(q)),
    );
  }, [items, activeCategory, query]);

  // Cart quantity per menu item (for the badge on cards)
  const cartQtyByItem = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const l of cart) map.set(l.menuItemId, (map.get(l.menuItemId) ?? 0) + l.quantity);
    return map;
  }, [cart]);

  const totals = computeTotals({
    lines: cart,
    taxBps: branch.taxBps,
    serviceBps: branch.serviceBps,
    discountCents: rupeesToPaisa(discountRupees || 0),
    tipCents: rupeesToPaisa(tipRupees || 0),
    deliveryChargeCents: channel === "DELIVERY" ? rupeesToPaisa(deliveryRupees || 0) : 0,
  });

  function addLine(line: CartLine) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.lineKey === line.lineKey);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx]!;
        next[idx] = { ...existing, quantity: existing.quantity + line.quantity };
        return next;
      }
      return [...prev, line];
    });
  }
  function bumpLine(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.lineKey === key ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.lineKey !== key));
  }
  function resetOrder() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setDiscountRupees(0);
    setTipRupees(0);
    setDeliveryRupees(0);
    setOrderNotes("");
    setTableId("");
  }

  async function submit() {
    if (cart.length === 0) {
      toast({ variant: "warning", title: "Cart is empty" });
      return;
    }
    setSubmitting(true);
    const idempotencyKey = `${branchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await createOrderAction(slug, {
      branchId,
      channel,
      tableId: channel === "DINE_IN" ? tableId : "",
      customerPhone: channel === "DELIVERY" || customerPhone ? customerPhone : "",
      customerName,
      deliveryAddress: channel === "DELIVERY" ? deliveryAddress : "",
      items: cart.map((l) => ({
        menuItemId: l.menuItemId,
        variantId: l.variantId,
        quantity: l.quantity,
        notes: l.notes ?? "",
        modifierIds: l.modifiers.map((m) => m.modifierId),
      })),
      discountCents: rupeesToPaisa(discountRupees || 0),
      tipCents: rupeesToPaisa(tipRupees || 0),
      deliveryChargeCents: channel === "DELIVERY" ? rupeesToPaisa(deliveryRupees || 0) : 0,
      notes: orderNotes,
      idempotencyKey,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t create order", description: res.error });
      return;
    }
    toast({
      variant: "success",
      title: `Order #${res.data.orderNumber.toString().padStart(4, "0")} sent`,
      description: "Kitchen has been notified.",
    });
    resetOrder();
    router.refresh();
  }

  const sendDisabled =
    cart.length === 0 ||
    submitting ||
    (channel === "DINE_IN" && branchTables.length > 0 && !tableId) ||
    (channel === "DELIVERY" && (!customerPhone || !deliveryAddress));

  return (
    <div className="flex h-screen flex-col bg-surface-muted/40">
      {/* Top bar */}
      <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <Link
          href={`/${slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-muted"
          aria-label="Back to dashboard"
        >
          <MenuIcon className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Utensils className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{tenantName}</p>
            <p className="font-mono text-[10px] text-foreground-muted">POS · {branch.name}</p>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-xl md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <Input
              className="h-10 rounded-full bg-surface-muted/70 pl-10 placeholder:text-foreground-subtle"
              placeholder="Search Product…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {branches.length > 1 ? (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : null}
          <Link
            href={`/${slug}`}
            className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground-muted hover:bg-surface-muted hover:text-foreground md:inline-flex"
          >
            <ArrowLeft className="h-3 w-3" /> Exit
          </Link>
        </div>
      </header>

      {/* Body: 3-column layout */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT: category rail — white elevated cards, ClaPos-style */}
        <aside className="flex w-28 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-background p-3">
          <CategoryButton
            icon={LayoutGrid}
            label="All Menu"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {categories.map((c) => {
            const count = items.filter((i) => i.categoryId === c.id).length;
            return (
              <CategoryButton
                key={c.id}
                icon={iconForCategory(c.name)}
                label={c.name}
                count={count}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
              />
            );
          })}
        </aside>

        {/* MIDDLE: products */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile search */}
          <div className="md:hidden border-b border-border bg-background px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
              <Input
                className="h-10 rounded-full pl-9"
                placeholder="Search products…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-foreground-muted">
                  {query ? "No items match that search." : "No items in this category."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filtered.map((it, i) => {
                  const def = it.variants.find((v) => v.isDefault) ?? it.variants[0];
                  const qtyInCart = cartQtyByItem.get(it.id) ?? 0;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setPicker(it)}
                      style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                      className="group relative flex animate-fade-in flex-col overflow-hidden rounded-2xl bg-background text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
                        {it.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.photoUrl}
                            alt={it.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-7 w-7 text-foreground-subtle" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 pt-3">
                        <p className="line-clamp-1 text-sm font-medium leading-tight">
                          {it.name}
                        </p>
                        <div className="mt-1 flex items-center justify-center gap-2">
                          <span className="font-mono text-sm text-foreground">
                            {def ? formatMoney(def.priceCents) : "—"}
                          </span>
                          {qtyInCart > 0 ? (
                            <span className="flex h-5 min-w-[20px] animate-scale-in items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-foreground shadow-sm">
                              {qtyInCart}
                            </span>
                          ) : null}
                        </div>
                        {it.variants.length > 1 ? (
                          <p className="mt-0.5 text-[10px] text-foreground-subtle">
                            +{it.variants.length - 1} size{it.variants.length > 2 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>
                      {/* Orange underline bar under the card when in cart */}
                      <span
                        aria-hidden
                        className={cn(
                          "mx-auto mt-3 h-0.5 rounded-full transition-all duration-200",
                          qtyInCart > 0 ? "w-16 bg-primary" : "w-0 bg-transparent",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: order summary — ClaPos-style */}
        <aside className="hidden w-[380px] flex-shrink-0 flex-col border-l border-border bg-background lg:flex">
          {/* 2×2 quick-action tiles */}
          <div className="grid grid-cols-2 gap-3 border-b border-border p-4">
            <QuickAction
              icon={User}
              label="Customer"
              active={!!customerPhone || !!customerName}
              onClick={() => setOpenPopover("customer")}
            />
            <QuickAction
              icon={Table2}
              label="Tables"
              active={!!tableId}
              onClick={() => setOpenPopover("tables")}
              disabled={channel !== "DINE_IN" || branchTables.length === 0}
            />
            <QuickAction
              icon={Percent}
              label="Discount"
              active={discountRupees > 0 || tipRupees > 0 || deliveryRupees > 0}
              onClick={() => setOpenPopover("discount")}
            />
            <QuickAction
              icon={StickyNote}
              label="Notes"
              active={!!orderNotes}
              onClick={() => setOpenPopover("notes")}
            />
          </div>

          {/* Heading + channel tabs */}
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="text-lg font-semibold">Order Details</h2>
          </div>
          <div className="flex gap-6 border-b border-border px-5 pb-2 text-sm">
            <ChannelTab active={channel === "DINE_IN"} onClick={() => setChannel("DINE_IN")}>
              Dine In
            </ChannelTab>
            {hasTakeaway ? (
              <ChannelTab active={channel === "TAKEAWAY"} onClick={() => setChannel("TAKEAWAY")}>
                Take Away
              </ChannelTab>
            ) : null}
            {hasDelivery ? (
              <ChannelTab active={channel === "DELIVERY"} onClick={() => setChannel("DELIVERY")}>
                Delivery
              </ChannelTab>
            ) : null}
          </div>

          {/* Context line (only when set) */}
          {channel === "DINE_IN" && tableId ? (
            <p className="px-5 py-2 text-xs text-foreground-muted">
              Table:{" "}
              <span className="font-medium text-foreground">
                {branchTables.find((t) => t.id === tableId)?.label}
              </span>
            </p>
          ) : null}
          {channel === "DELIVERY" && customerPhone && deliveryAddress ? (
            <p className="line-clamp-1 px-5 py-2 text-xs text-foreground-muted">
              {customerName || customerPhone} ·{" "}
              <span className="text-foreground">{deliveryAddress}</span>
            </p>
          ) : null}

          {/* Cart list */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">No items yet</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Tap a product to start the order.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {cart.map((l) => {
                    const lineSub =
                      (l.unitPriceCents +
                        l.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0)) *
                      l.quantity;
                    return (
                      <li
                        key={l.lineKey}
                        className="group py-3 transition-colors hover:bg-surface-muted/50"
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight">
                              {l.itemNameSnap}
                            </p>
                            <p className="mt-1 font-mono text-xs text-foreground-muted">
                              <span className="font-semibold">×{l.quantity}</span>{" "}
                              <span className="text-foreground-subtle">
                                {formatMoney(l.unitPriceCents)}
                              </span>
                              {l.modifiers.length > 0 ? (
                                <span className="text-foreground-subtle">
                                  {" "}
                                  · +{l.modifiers.length} add-on{l.modifiers.length > 1 ? "s" : ""}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-foreground-subtle">
                              {l.variantNameSnap}
                              {l.modifiers.length > 0
                                ? ` · ${l.modifiers.map((m) => m.modifierNameSnap).join(", ")}`
                                : ""}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-semibold">
                            {formatMoney(lineSub)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => bumpLine(l.lineKey, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition-colors hover:bg-border hover:text-foreground active:scale-95"
                            aria-label="Decrease"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs">{l.quantity}</span>
                          <button
                            type="button"
                            onClick={() => bumpLine(l.lineKey, +1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-foreground-muted transition-colors hover:bg-border hover:text-foreground active:scale-95"
                            aria-label="Increase"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(l.lineKey)}
                            className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-danger-subtle hover:text-danger active:scale-95"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Clear All Order — ClaPos style outlined button */}
            {cart.length > 0 ? (
              <div className="border-t border-border px-5 py-3">
                <button
                  type="button"
                  onClick={resetOrder}
                  className="h-10 w-full rounded-xl border border-border bg-background text-sm font-medium text-foreground-muted transition-colors hover:border-danger/50 hover:text-danger"
                >
                  Clear All Order
                </button>
              </div>
            ) : null}

            {/* Totals card */}
            <div className="border-t border-border bg-surface-muted/40 px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />
                {totals.discountCents > 0 ? (
                  <Row
                    label="Discount"
                    value={`− ${formatMoney(totals.discountCents)}`}
                    tone="success"
                  />
                ) : null}
                {totals.taxCents > 0 ? (
                  <Row
                    label={`Tax ${(branch.taxBps / 100).toFixed(0)}%`}
                    value={formatMoney(totals.taxCents)}
                  />
                ) : null}
                {totals.serviceCents > 0 ? (
                  <Row
                    label={`Service ${(branch.serviceBps / 100).toFixed(0)}%`}
                    value={formatMoney(totals.serviceCents)}
                  />
                ) : null}
                {totals.tipCents > 0 ? (
                  <Row label="Tip" value={formatMoney(totals.tipCents)} />
                ) : null}
                {totals.deliveryChargeCents > 0 ? (
                  <Row label="Delivery" value={formatMoney(totals.deliveryChargeCents)} />
                ) : null}
              </dl>
              <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                <span className="text-base font-semibold">Total</span>
                <span className="font-mono text-3xl font-bold">
                  {formatMoney(totals.totalCents)}
                </span>
              </div>
            </div>

            {/* Process Transaction pill — the big call-to-action */}
            <div className="px-5 pb-5 pt-3">
              <Button
                className="h-14 w-full rounded-full text-base font-semibold shadow-md"
                disabled={sendDisabled}
                loading={submitting}
                onClick={submit}
              >
                <Receipt className="h-5 w-5" />
                Process Transaction
              </Button>
              {sendDisabled && cart.length > 0 ? (
                <p className="mt-2 text-center text-[11px] text-warning">
                  {channel === "DINE_IN" && branchTables.length > 0 && !tableId
                    ? "Pick a table to send."
                    : channel === "DELIVERY" && (!customerPhone || !deliveryAddress)
                      ? "Customer phone + delivery address required."
                      : ""}
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        {/* Mobile cart FAB */}
        {cart.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpenPopover("notes")}
            className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 animate-scale-in items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 lg:hidden"
          >
            <ShoppingBag className="h-4 w-4" />
            {cart.reduce((s, l) => s + l.quantity, 0)} items ·{" "}
            <span className="font-mono">{formatMoney(totals.totalCents)}</span>
          </button>
        ) : null}
      </div>

      {/* Item picker modal */}
      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-md">
          {picker ? (
            <ItemPicker
              item={picker}
              onAdd={(line) => {
                addLine(line);
                setPicker(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Customer popover */}
      <Dialog open={openPopover === "customer"} onOpenChange={(o) => !o && setOpenPopover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer details</DialogTitle>
            <DialogDescription>
              Optional for dine-in and takeaway. Required for delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Name</label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Bilal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Phone</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="03001234567"
                inputMode="tel"
              />
            </div>
            {channel === "DELIVERY" ? (
              <div>
                <label className="mb-1 block text-xs font-medium">Delivery address</label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House #, Street, Area"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpenPopover(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tables popover */}
      <Dialog open={openPopover === "tables"} onOpenChange={(o) => !o && setOpenPopover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick a table</DialogTitle>
            <DialogDescription>
              Greyed-out tables are currently occupied.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {branchTables.map((t) => {
              const isOccupied = t.status === "OCCUPIED";
              const isSelected = t.id === tableId;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => {
                    setTableId(t.id);
                    setOpenPopover(null);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-3 text-sm transition-all",
                    isSelected
                      ? "border-primary bg-primary-subtle text-primary"
                      : "border-border hover:bg-surface-muted",
                    isOccupied && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Table2 className="h-5 w-5" />
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-foreground-muted">{t.seats} seats</span>
                  {isOccupied ? <Badge variant="warning">Occupied</Badge> : null}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount popover */}
      <Dialog open={openPopover === "discount"} onOpenChange={(o) => !o && setOpenPopover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply discount</DialogTitle>
            <DialogDescription>
              Applied to the subtotal before tax and service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Discount (PKR)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={discountRupees || ""}
                onChange={(e) => setDiscountRupees(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setDiscountRupees(
                      Math.round((totals.subtotalCents / 100) * (p / 100) * 100) / 100,
                    )
                  }
                  className="flex-1 rounded-full border border-border py-1.5 text-xs hover:bg-surface-muted"
                >
                  {p}%
                </button>
              ))}
            </div>
            {tipRupees !== undefined ? (
              <div>
                <label className="mb-1 block text-xs font-medium">Tip (PKR)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={tipRupees || ""}
                  onChange={(e) => setTipRupees(parseFloat(e.target.value) || 0)}
                />
              </div>
            ) : null}
            {channel === "DELIVERY" ? (
              <div>
                <label className="mb-1 block text-xs font-medium">Delivery charge (PKR)</label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={deliveryRupees || ""}
                  onChange={(e) => setDeliveryRupees(parseFloat(e.target.value) || 0)}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDiscountRupees(0); setTipRupees(0); setDeliveryRupees(0); }}>
              Reset
            </Button>
            <Button onClick={() => setOpenPopover(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes popover (also serves as mobile cart) */}
      <Dialog open={openPopover === "notes"} onOpenChange={(o) => !o && setOpenPopover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order notes</DialogTitle>
            <DialogDescription>
              Seen by the kitchen on the KDS card.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="e.g. Less spice, extra napkins"
          />
          <DialogFooter>
            <Button onClick={() => setOpenPopover(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryButton({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-[11px] font-medium leading-tight transition-all duration-150 active:scale-95",
        active
          ? "border-l-[3px] border-primary bg-background text-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.04),0_2px_8px_-2px_rgba(0,0,0,0.08)]"
          : "border-l-[3px] border-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          active ? "bg-primary-subtle text-primary" : "bg-surface-muted",
        )}
      >
        <Icon className={cn("h-4 w-4 transition-transform", !active && "group-hover:scale-110")} />
      </span>
      <span className="line-clamp-2 text-center">{label}</span>
      {count !== undefined && count > 0 && !active ? (
        <span className="font-mono text-[9px] text-foreground-subtle">{count}</span>
      ) : null}
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border bg-surface px-3 py-4 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm active:scale-95",
        active
          ? "border-primary/60 bg-primary-subtle/60 text-primary"
          : "border-border text-foreground-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function ChannelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px relative px-1 pb-2.5 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-foreground-muted hover:text-foreground",
      )}
    >
      {children}
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
        />
      ) : null}
    </button>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className={cn("font-mono", tone === "success" && "text-success")}>{value}</dd>
    </div>
  );
}

function ItemPicker({ item, onAdd }: { item: ItemPick; onAdd: (line: CartLine) => void }) {
  const def = item.variants.find((v) => v.isDefault) ?? item.variants[0]!;
  const [variantId, setVariantId] = React.useState(def.id);
  const [selectedMods, setSelectedMods] = React.useState<Record<string, Set<string>>>({});
  const [qty, setQty] = React.useState(1);

  function toggleMod(groupId: string, modifierId: string, group: ItemPick["modifierGroups"][number]) {
    setSelectedMods((prev) => {
      const next = { ...prev };
      const current = new Set(next[groupId] ?? []);
      if (current.has(modifierId)) {
        current.delete(modifierId);
      } else {
        if (current.size >= group.maxSelect) {
          if (group.maxSelect === 1) {
            current.clear();
          } else {
            return prev;
          }
        }
        current.add(modifierId);
      }
      next[groupId] = current;
      return next;
    });
  }

  const allGroupsValid = item.modifierGroups.every((g) => {
    const selected = selectedMods[g.id]?.size ?? 0;
    if (g.required && selected < g.minSelect) return false;
    if (selected > g.maxSelect) return false;
    return true;
  });

  const variant = item.variants.find((v) => v.id === variantId)!;
  const modList = item.modifierGroups.flatMap((g) =>
    [...(selectedMods[g.id] ?? [])].map((id) => {
      const m = g.modifiers.find((x) => x.id === id)!;
      return { modifierId: m.id, modifierNameSnap: m.name, priceDeltaCents: m.priceDeltaCents };
    }),
  );
  const total = (variant.priceCents + modList.reduce((s, m) => s + m.priceDeltaCents, 0)) * qty;

  function add() {
    const modIds = modList.map((m) => m.modifierId);
    onAdd({
      lineKey: lineKey(variant.id, modIds),
      menuItemId: item.id,
      variantId: variant.id,
      itemNameSnap: item.name,
      variantNameSnap: variant.name,
      unitPriceCents: variant.priceCents,
      quantity: qty,
      modifiers: modList,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.name}</DialogTitle>
        <DialogDescription>
          Pick a variant{item.modifierGroups.length > 0 ? " and any add-ons" : ""}.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto">
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground-muted">Variant</p>
          <div className="grid grid-cols-2 gap-2">
            {item.variants.map((v) => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVariantId(v.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2 text-sm transition-colors",
                  variantId === v.id
                    ? "border-primary bg-primary-subtle text-primary"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <span>{v.name}</span>
                <span className="font-mono">{formatMoney(v.priceCents)}</span>
              </button>
            ))}
          </div>
        </div>
        {item.modifierGroups.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-foreground-muted">
              {g.name}
              <Badge variant={g.required ? "warning" : "neutral"}>
                {g.required ? `Pick ${g.minSelect}` : `Up to ${g.maxSelect}`}
              </Badge>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {g.modifiers.map((m) => {
                const checked = selectedMods[g.id]?.has(m.id) ?? false;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleMod(g.id, m.id, g)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary-subtle text-primary"
                        : "border-border hover:bg-surface-muted",
                    )}
                  >
                    <span>{m.name}</span>
                    {m.priceDeltaCents !== 0 ? (
                      <span className="font-mono text-xs">+{formatMoney(m.priceDeltaCents)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <DialogFooter>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-7 text-center font-mono">{qty}</span>
          <Button size="icon" variant="ghost" onClick={() => setQty(Math.min(99, qty + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button onClick={add} disabled={!allGroupsValid}>
          Add · {formatMoney(total)}
        </Button>
      </DialogFooter>
    </>
  );
}
