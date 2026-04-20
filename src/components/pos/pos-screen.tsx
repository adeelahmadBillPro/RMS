"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Minus, Plus, Trash2, X } from "lucide-react";
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
import { formatMoney, rupeesToPaisa } from "@/lib/utils";
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

  const [activeCategory, setActiveCategory] = React.useState<string>(categories[0]?.id ?? "");
  const [picker, setPicker] = React.useState<ItemPick | null>(null);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const filtered = items.filter((i) => i.categoryId === activeCategory);

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
  function bumpLine(lineKeyToBump: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.lineKey === lineKeyToBump ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(lineKeyToRemove: string) {
    setCart((prev) => prev.filter((l) => l.lineKey !== lineKeyToRemove));
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
    toast({ variant: "success", title: `Order #${res.data.orderNumber} sent`, description: "Kitchen has been notified." });
    resetOrder();
    router.refresh();
  }

  return (
    <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_380px]">
      {/* LEFT: menu grid */}
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-background px-3">
          <Link href={`/${slug}`} className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="text-sm font-medium">{tenantName} · POS</div>
          {branches.length > 1 ? (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.isPrimary ? " · primary" : ""}</option>
              ))}
            </select>
          ) : <span />}
        </header>

        {/* Channel + categories */}
        <div className="border-b border-border bg-surface px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelButton active={channel === "DINE_IN"} onClick={() => setChannel("DINE_IN")}>
              Dine-in
            </ChannelButton>
            {hasTakeaway ? (
              <ChannelButton active={channel === "TAKEAWAY"} onClick={() => setChannel("TAKEAWAY")}>
                Takeaway
              </ChannelButton>
            ) : null}
            {hasDelivery ? (
              <ChannelButton active={channel === "DELIVERY"} onClick={() => setChannel("DELIVERY")}>
                Delivery
              </ChannelButton>
            ) : null}
            {channel === "DINE_IN" && branchTables.length > 0 ? (
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="ml-auto h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Pick table —</option>
                {branchTables.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.status === "OCCUPIED"}>
                    {t.label} · {t.seats} seats{t.status !== "FREE" ? ` · ${t.status}` : ""}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
                activeCategory === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-foreground-muted hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((it, i) => {
              const def = it.variants.find((v) => v.isDefault) ?? it.variants[0];
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setPicker(it)}
                  style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
                  className="group flex animate-fade-in flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                    {it.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.photoUrl}
                        alt={it.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-foreground-subtle" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium leading-tight">{it.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-foreground-muted">
                      {def ? formatMoney(def.priceCents) : "—"}
                      {it.variants.length > 1 ? <span className="ml-1">+{it.variants.length - 1}</span> : null}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? (
              <p className="col-span-full text-sm text-foreground-muted">No items in this category.</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* RIGHT: cart */}
      <aside className="flex h-screen flex-col border-l border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-3 py-3">
          <h2 className="text-sm font-medium">Current order</h2>
          {cart.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={resetOrder}>
              <X className="h-3 w-3" /> Clear
            </Button>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground-muted">Tap items to add.</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((l) => {
                const lineSub = (l.unitPriceCents + l.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0)) * l.quantity;
                return (
                  <li key={l.lineKey} className="rounded-md border border-border bg-background p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{l.itemNameSnap}</p>
                        <p className="text-xs text-foreground-muted">{l.variantNameSnap}</p>
                        {l.modifiers.length > 0 ? (
                          <p className="mt-0.5 text-xs text-foreground-muted">
                            {l.modifiers.map((m) => m.modifierNameSnap).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{formatMoney(lineSub)}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bumpLine(l.lineKey, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-mono text-sm">{l.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bumpLine(l.lineKey, +1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(l.lineKey)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-3 text-sm">
          {channel === "DELIVERY" ? (
            <div className="mb-2 space-y-2">
              <Input placeholder="Customer phone (03…)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              <Input placeholder="Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <NumberRow label="Discount" value={discountRupees} onChange={setDiscountRupees} />
            <NumberRow label="Tip" value={tipRupees} onChange={setTipRupees} />
            {channel === "DELIVERY" ? (
              <NumberRow label="Delivery" value={deliveryRupees} onChange={setDeliveryRupees} />
            ) : null}
          </div>

          <dl className="mt-3 space-y-1 text-xs">
            <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />
            {totals.discountCents > 0 ? <Row label="Discount" value={`− ${formatMoney(totals.discountCents)}`} /> : null}
            {totals.taxCents > 0 ? <Row label={`Tax (${(branch.taxBps / 100).toFixed(0)}%)`} value={formatMoney(totals.taxCents)} /> : null}
            {totals.serviceCents > 0 ? <Row label={`Service (${(branch.serviceBps / 100).toFixed(0)}%)`} value={formatMoney(totals.serviceCents)} /> : null}
            {totals.tipCents > 0 ? <Row label="Tip" value={formatMoney(totals.tipCents)} /> : null}
            {totals.deliveryChargeCents > 0 ? <Row label="Delivery" value={formatMoney(totals.deliveryChargeCents)} /> : null}
          </dl>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-medium">Total</span>
            <span className="font-mono text-h3">{formatMoney(totals.totalCents)}</span>
          </div>

          <Button
            className="mt-3 w-full"
            size="lg"
            disabled={
              cart.length === 0 ||
              submitting ||
              (channel === "DINE_IN" && branchTables.length > 0 && !tableId) ||
              (channel === "DELIVERY" && (!customerPhone || !deliveryAddress))
            }
            loading={submitting}
            onClick={submit}
          >
            Send to kitchen · {formatMoney(totals.totalCents)}
          </Button>
        </div>
      </aside>

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
    </div>
  );
}

function ChannelButton({
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
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-foreground text-background" : "bg-surface-muted text-foreground-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-foreground-muted">{label} (PKR)</label>
      <Input
        type="number"
        step="0.01"
        min="0"
        className="mt-0.5 h-8"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
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
        // Enforce maxSelect
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

  // Validate: each required group meets minSelect ≤ |selected| ≤ maxSelect
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
        <DialogDescription>Pick a variant{item.modifierGroups.length > 0 ? " and any add-ons" : ""}.</DialogDescription>
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
                className={`flex items-center justify-between rounded-md border p-2 text-sm transition-colors ${
                  variantId === v.id ? "border-primary bg-primary-subtle text-primary" : "border-border hover:bg-surface-muted"
                }`}
              >
                <span>{v.name}</span>
                <span className="font-mono">{formatMoney(v.priceCents)}</span>
              </button>
            ))}
          </div>
        </div>
        {item.modifierGroups.map((g) => (
          <div key={g.id}>
            <p className="mb-1.5 text-xs font-medium text-foreground-muted">
              {g.name}{" "}
              <Badge variant={g.required ? "warning" : "neutral"} className="ml-1">
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
                    className={`flex items-center justify-between rounded-md border p-2 text-sm transition-colors ${
                      checked ? "border-primary bg-primary-subtle text-primary" : "border-border hover:bg-surface-muted"
                    }`}
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
