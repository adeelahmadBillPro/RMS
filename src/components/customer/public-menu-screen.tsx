"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { placePublicOrderAction } from "@/server/actions/public-order.actions";
import { computeTotals, lineKey, type CartLine } from "@/lib/orders/cart";
import { formatMoney } from "@/lib/utils";

type Variant = { id: string; name: string; priceCents: number; isDefault: boolean };
type Modifier = { id: string; name: string; priceDeltaCents: number };
type ModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
};
export type PublicItem = {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  categoryId: string;
  variants: Variant[];
  modifierGroups: ModifierGroup[];
};
export type PublicCategory = { id: string; name: string };

type Props = {
  slug: string;
  tenantName: string;
  hasDelivery: boolean;
  hasTakeaway: boolean;
  defaultChannel: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  categories: PublicCategory[];
  items: PublicItem[];
} & (
  | { mode: "table"; tableLabel: string; tableQr: string }
  | { mode: "generic"; tableLabel?: never; tableQr?: never }
);

export function PublicMenuScreen(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = React.useState<string>(props.categories[0]?.id ?? "");
  const [picker, setPicker] = React.useState<PublicItem | null>(null);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [checkout, setCheckout] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{ orderNumber: number; trackingId: string } | null>(null);

  const [channel, setChannel] = React.useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">(
    props.mode === "table" ? "DINE_IN" : props.defaultChannel,
  );
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const filtered = props.items.filter((i) => i.categoryId === activeCategory);
  // Public menu shows tax/service computed by the server on submit; here we
  // display only subtotal to keep it simple and avoid lying about tax.
  const subtotal = computeTotals({ lines: cart, taxBps: 0, serviceBps: 0 }).subtotalCents;
  const cartItemCount = cart.reduce((s, l) => s + l.quantity, 0);

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

  async function submit() {
    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});
    const idempotencyKey = `public-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const res = await placePublicOrderAction({
      slug: props.slug,
      tableQr: props.mode === "table" ? props.tableQr : "",
      channel,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: channel === "DELIVERY" ? deliveryAddress.trim() : "",
      items: cart.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        notes: l.notes ?? "",
        modifierIds: l.modifiers.map((m) => m.modifierId),
      })),
      notes: orderNotes,
      idempotencyKey,
    });
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    setSuccess({ orderNumber: res.data.orderNumber, trackingId: res.data.trackingId });
    setCart([]);
    setCheckout(false);
    setCartOpen(false);
    // Navigate to the tracking page so the customer can watch their order live.
    router.push(`/r/${props.slug}/order/${res.data.trackingId}`);
  }

  if (success) {
    return (
      <div className="container flex flex-1 items-center justify-center py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-h1">Order #{success.orderNumber.toString().padStart(4, "0")} placed</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {props.mode === "table"
              ? `${props.tenantName} will start preparing your order. We’ll bring it to ${props.tableLabel}.`
              : `${props.tenantName} has your order. They’ll be in touch on ${customerPhone}.`}
          </p>
          <Button className="mt-6" onClick={() => setSuccess(null)}>
            Order more
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {props.mode === "table" ? (
        <div className="bg-info-subtle px-4 py-2 text-center text-xs text-info">
          Ordering for table <span className="font-medium">{props.tableLabel}</span>
        </div>
      ) : null}

      {/* Channel switcher (generic mode only) */}
      {props.mode === "generic" && (props.hasTakeaway || props.hasDelivery) ? (
        <div className="border-b border-border bg-surface px-3 py-2">
          <div className="container flex flex-wrap items-center gap-2 text-xs">
            {props.hasTakeaway ? (
              <button
                type="button"
                onClick={() => setChannel("TAKEAWAY")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  channel === "TAKEAWAY"
                    ? "bg-foreground text-background"
                    : "bg-surface-muted text-foreground-muted hover:text-foreground"
                }`}
              >
                Takeaway
              </button>
            ) : null}
            {props.hasDelivery ? (
              <button
                type="button"
                onClick={() => setChannel("DELIVERY")}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  channel === "DELIVERY"
                    ? "bg-foreground text-background"
                    : "bg-surface-muted text-foreground-muted hover:text-foreground"
                }`}
              >
                Delivery
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Categories */}
      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2">
        {props.categories.map((c) => (
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
      </nav>

      {/* Items */}
      <div className="container grid gap-4 py-6 pb-28 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it, i) => {
          const def = it.variants.find((v) => v.isDefault) ?? it.variants[0];
          return (
            <button
              type="button"
              key={it.id}
              onClick={() => setPicker(it)}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="group flex w-full animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
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
                    <ImageIcon className="h-8 w-8 text-foreground-subtle" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2.5 py-1 font-mono text-xs shadow-sm backdrop-blur">
                  {def ? formatMoney(def.priceCents) : "—"}
                  {it.variants.length > 1 ? (
                    <span className="ml-1 text-foreground-muted">+{it.variants.length - 1}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-sm font-medium leading-tight group-hover:text-primary">
                  {it.name}
                </p>
                {it.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">
                    {it.description}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky cart pill */}
      {cart.length > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary-hover"
        >
          <ShoppingBag className="h-4 w-4" />
          {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
          <span className="font-mono">{formatMoney(subtotal)}</span>
        </button>
      ) : null}

      {/* Item picker */}
      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-md">
          {picker ? (
            <ItemPicker item={picker} onAdd={(line) => { addLine(line); setPicker(null); }} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cart drawer */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your order</DialogTitle>
            <DialogDescription>{cartItemCount} item{cartItemCount === 1 ? "" : "s"}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            <ul className="divide-y divide-border">
              {cart.map((l) => {
                const lineSub = (l.unitPriceCents + l.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0)) * l.quantity;
                return (
                  <li key={l.lineKey} className="flex items-start gap-2 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{l.itemNameSnap}</p>
                      <p className="text-xs text-foreground-muted">{l.variantNameSnap}</p>
                      {l.modifiers.length > 0 ? (
                        <p className="mt-0.5 text-xs text-foreground-muted">
                          {l.modifiers.map((m) => m.modifierNameSnap).join(", ")}
                        </p>
                      ) : null}
                      <div className="mt-1 flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bumpLine(l.lineKey, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-mono text-sm">{l.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => bumpLine(l.lineKey, +1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => removeLine(l.lineKey)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="font-mono text-sm">{formatMoney(lineSub)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-medium">Subtotal</span>
            <span className="font-mono text-h3">{formatMoney(subtotal)}</span>
          </div>
          <p className="text-right text-xs text-foreground-muted">Tax / service charged at checkout.</p>
          <DialogFooter>
            <Button onClick={() => { setCartOpen(false); setCheckout(true); }} disabled={cart.length === 0}>
              Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout drawer */}
      <Dialog open={checkout} onOpenChange={setCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Almost done</DialogTitle>
            <DialogDescription>We need a few details to confirm your order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {serverError ? (
              <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger" role="alert">
                {serverError}
              </div>
            ) : null}
            <FormField>
              <Label htmlFor="public-name" required>Your name</Label>
              <Input
                id="public-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                invalid={!!fieldErrors.customerName}
              />
              <FieldError message={fieldErrors.customerName} />
            </FormField>
            <FormField>
              <Label htmlFor="public-phone" required>Phone</Label>
              <Input
                id="public-phone"
                placeholder="03001234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                invalid={!!fieldErrors.customerPhone}
                inputMode="tel"
              />
              <FieldHint>So we can reach you about your order.</FieldHint>
              <FieldError message={fieldErrors.customerPhone} />
            </FormField>
            {channel === "DELIVERY" ? (
              <FormField>
                <Label htmlFor="public-address" required>Delivery address</Label>
                <Input
                  id="public-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  invalid={!!fieldErrors.deliveryAddress}
                />
                <FieldError message={fieldErrors.deliveryAddress} />
              </FormField>
            ) : null}
            <FormField>
              <Label htmlFor="public-notes">Notes (optional)</Label>
              <Input
                id="public-notes"
                placeholder="Any special instructions?"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </FormField>
            {props.mode === "table" ? (
              <p className="text-xs text-foreground-muted">
                Sending to <Badge variant="info" className="ml-1">{props.tableLabel}</Badge>
              </p>
            ) : (
              <p className="text-xs text-foreground-muted">
                Channel: <Badge variant="info" className="ml-1">{channel}</Badge>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCheckout(false)} variant="ghost">Back</Button>
            <Button onClick={submit} loading={submitting}>
              Place order · {formatMoney(subtotal)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ItemPicker({ item, onAdd }: { item: PublicItem; onAdd: (line: CartLine) => void }) {
  const def = item.variants.find((v) => v.isDefault) ?? item.variants[0]!;
  const [variantId, setVariantId] = React.useState(def.id);
  const [selectedMods, setSelectedMods] = React.useState<Record<string, Set<string>>>({});
  const [qty, setQty] = React.useState(1);

  function toggleMod(group: ModifierGroup, modifierId: string) {
    setSelectedMods((prev) => {
      const next = { ...prev };
      const current = new Set(next[group.id] ?? []);
      if (current.has(modifierId)) {
        current.delete(modifierId);
      } else {
        if (current.size >= group.maxSelect) {
          if (group.maxSelect === 1) current.clear();
          else return prev;
        }
        current.add(modifierId);
      }
      next[group.id] = current;
      return next;
    });
  }

  const allValid = item.modifierGroups.every((g) => {
    const sel = selectedMods[g.id]?.size ?? 0;
    if (g.required && sel < g.minSelect) return false;
    if (sel > g.maxSelect) return false;
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.name}</DialogTitle>
        {item.description ? <DialogDescription>{item.description}</DialogDescription> : null}
      </DialogHeader>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        {item.variants.length > 1 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground-muted">Choose</p>
            <div className="grid grid-cols-2 gap-2">
              {item.variants.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`flex items-center justify-between rounded-md border p-2 text-sm transition-colors ${
                    variantId === v.id
                      ? "border-primary bg-primary-subtle text-primary"
                      : "border-border hover:bg-surface-muted"
                  }`}
                >
                  <span>{v.name}</span>
                  <span className="font-mono">{formatMoney(v.priceCents)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
                    key={m.id}
                    type="button"
                    onClick={() => toggleMod(g, m.id)}
                    className={`flex items-center justify-between rounded-md border p-2 text-sm transition-colors ${
                      checked
                        ? "border-primary bg-primary-subtle text-primary"
                        : "border-border hover:bg-surface-muted"
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
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-7 text-center font-mono">{qty}</span>
          <Button size="icon" variant="ghost" onClick={() => setQty(Math.min(20, qty + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <Button
          disabled={!allValid}
          onClick={() => {
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
          }}
        >
          Add · {formatMoney(total)}
        </Button>
      </DialogFooter>
    </>
  );
}
