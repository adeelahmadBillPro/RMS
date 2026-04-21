"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Heart,
  Image as ImageIcon,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserPlus,
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
import { useFavoriteItems } from "@/lib/customer/favorites";
import { haptic } from "@/lib/ui/haptics";
import { formatMoney } from "@/lib/utils";

const CART_STORAGE_PREFIX = "easymenu:cart:v1:";

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
  deliveryAreas?: string[];
  deliveryFeeCents?: number;
  deliveryMinOrderCents?: number;
  categories: PublicCategory[];
  items: PublicItem[];
} & (
  | { mode: "table"; tableLabel: string; tableQr: string }
  | { mode: "generic"; tableLabel?: never; tableQr?: never }
);

export function PublicMenuScreen(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  // Only show categories that actually have at least one available item.
  // Empty categories looked clickable but went to a blank grid.
  const nonEmptyCategoryIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of props.items) set.add(it.categoryId);
    return set;
  }, [props.items]);
  const visibleCategories = React.useMemo(
    () => props.categories.filter((c) => nonEmptyCategoryIds.has(c.id)),
    [props.categories, nonEmptyCategoryIds],
  );
  const [activeCategory, setActiveCategory] = React.useState<string>(
    visibleCategories[0]?.id ?? props.categories[0]?.id ?? "",
  );
  const [picker, setPicker] = React.useState<PublicItem | null>(null);
  const { data: session } = useSession();
  const { isFavorite, toggle: toggleFav } = useFavoriteItems(props.slug);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartHydrated, setCartHydrated] = React.useState(false);
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

  // Prefill from logged-in user so returning customers don't re-enter their name.
  React.useEffect(() => {
    if (session?.user?.name && !customerName) setCustomerName(session.user.name);
  }, [session?.user?.name, customerName]);

  // Hydrate cart from localStorage on mount (per tenant slug). Don't write
  // back until after hydration to avoid overwriting persisted state with [].
  const cartStorageKey = `${CART_STORAGE_PREFIX}${props.slug}`;
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed) && parsed.length > 0) setCart(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setCartHydrated(true);
  }, [cartStorageKey]);

  React.useEffect(() => {
    if (!cartHydrated) return;
    try {
      if (cart.length === 0) window.localStorage.removeItem(cartStorageKey);
      else window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      /* quota or private mode — ignore */
    }
  }, [cart, cartHydrated, cartStorageKey]);

  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  // Tip is captured in cents. Presets are computed against subtotal at render
  // time so they always match what the user is about to be charged.
  const [tipCents, setTipCents] = React.useState(0);

  const filtered = props.items.filter((i) => i.categoryId === activeCategory);
  // Public menu shows tax/service computed by the server on submit; here we
  // display only subtotal to keep it simple and avoid lying about tax.
  const subtotal = computeTotals({ lines: cart, taxBps: 0, serviceBps: 0 }).subtotalCents;
  const cartItemCount = cart.reduce((s, l) => s + l.quantity, 0);

  // Qty-per-menu-item for the in-card "+ N −" quick controls
  const cartQtyByItem = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const l of cart) map.set(l.menuItemId, (map.get(l.menuItemId) ?? 0) + l.quantity);
    return map;
  }, [cart]);

  /** Decide: can we add this item to the cart in a single tap? */
  function canQuickAdd(it: PublicItem): boolean {
    // Quick add only when no variant choice needed AND no required modifier groups
    if (it.variants.length !== 1) return false;
    return !it.modifierGroups.some((g) => g.required);
  }

  /** Add one of the default variant of this item without opening the picker. */
  function quickAdd(it: PublicItem) {
    const v = it.variants.find((x) => x.isDefault) ?? it.variants[0]!;
    const line: CartLine = {
      lineKey: lineKey(v.id, []),
      menuItemId: it.id,
      variantId: v.id,
      itemNameSnap: it.name,
      variantNameSnap: v.name,
      unitPriceCents: v.priceCents,
      quantity: 1,
      modifiers: [],
    };
    addLine(line);
    haptic.light();
  }

  /** Decrement count for the first matching line (the "no modifiers" one). */
  function quickDecrement(it: PublicItem) {
    const v = it.variants.find((x) => x.isDefault) ?? it.variants[0];
    if (!v) return;
    const key = lineKey(v.id, []);
    bumpLine(key, -1);
    haptic.light();
  }

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
    let res: Awaited<ReturnType<typeof placePublicOrderAction>>;
    try {
      res = await placePublicOrderAction({
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
        tipCents,
        idempotencyKey,
      });
    } catch {
      // Network drop / server crash mid-submit. Cart stays intact (in
      // localStorage) so user can retry without losing it.
      haptic.warn();
      setServerError(
        "Couldn’t reach the kitchen. Check your connection and try again — your cart is safe.",
      );
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    if (!res.ok) {
      haptic.warn();
      // Friendlier message when an item went off-menu mid-session.
      const looksLikeOOS = /unavailable|out of stock|off.menu/i.test(res.error);
      setServerError(
        looksLikeOOS
          ? "One of your items just went off-menu. Refresh to see the latest menu, then try again."
          : res.error,
      );
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      return;
    }
    haptic.success();
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
          {/* Guest account upsell — most natural moment to ask. */}
          {props.mode !== "table" && !session ? (
            <div className="mt-6 rounded-2xl border border-primary/30 bg-primary-subtle/40 p-4 text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Save this order, reorder in 1 tap</p>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    Create an account to track orders, save favorites, and reorder fast.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link
                      href={`/signup?callbackUrl=${encodeURIComponent(`/r/${props.slug}/account`)}`}
                    >
                      Create account
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <Button
            className="mt-6"
            variant={props.mode !== "table" && !session ? "ghost" : "primary"}
            onClick={() => setSuccess(null)}
          >
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

      {/* HERO PROMO STRIP */}
      {props.mode === "generic" ? (
        <section className="container pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-hover px-5 py-6 text-primary-foreground shadow-md md:px-8 md:py-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-8 h-44 w-44 rounded-full bg-white/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                {(props.deliveryMinOrderCents ?? 0) > 0 && channel === "DELIVERY" ? (
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                      Min order {formatMoney(props.deliveryMinOrderCents ?? 0)}
                    </span>
                  </p>
                ) : null}
                <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">
                  What are you craving today?
                </h2>
                <p className="mt-1 text-sm text-white/85 md:text-base">
                  Tap an item to add it fast — customise in one modal.
                </p>
              </div>
              <div className="hidden text-right text-xs text-white/85 md:block">
                <p className="opacity-80">Order method</p>
                <p className="mt-0.5 text-base font-semibold uppercase tracking-wide">
                  {channel === "DELIVERY" ? "Delivery" : "Takeaway"}
                </p>
              </div>
            </div>

            {/* Channel switcher becomes part of the hero */}
            {(props.hasTakeaway || props.hasDelivery) ? (
              <div className="relative mt-4 inline-flex gap-1 rounded-full bg-white/15 p-1 backdrop-blur">
                {props.hasTakeaway ? (
                  <button
                    type="button"
                    onClick={() => setChannel("TAKEAWAY")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      channel === "TAKEAWAY"
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/90 hover:text-white"
                    }`}
                  >
                    Takeaway
                  </button>
                ) : null}
                {props.hasDelivery ? (
                  <button
                    type="button"
                    onClick={() => setChannel("DELIVERY")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      channel === "DELIVERY"
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/90 hover:text-white"
                    }`}
                  >
                    Delivery
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Categories — container-aligned so it lines up with hero + items.
          Empty categories are filtered out. */}
      {visibleCategories.length > 0 ? (
        <nav className="sticky top-16 z-10 mt-4 border-b border-border bg-background/95 backdrop-blur">
          <div className="container flex gap-2 overflow-x-auto py-3">
            {visibleCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                  activeCategory === c.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface-muted text-foreground-muted hover:bg-border hover:text-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {/* Empty state when active category has nothing in it */}
      {filtered.length === 0 ? (
        <div className="container py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-subtle">
            <Search className="h-6 w-6" />
          </div>
          <p className="mt-4 text-h3">Nothing here yet</p>
          <p className="mt-1 text-sm text-foreground-muted">
            This category is empty right now. Try another category above.
          </p>
        </div>
      ) : null}

      {/* Items — grid is container-aligned; card count scales with viewport */}
      <div className="container grid grid-cols-2 gap-3 py-6 pb-28 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((it, i) => {
          const def = it.variants.find((v) => v.isDefault) ?? it.variants[0];
          const qtyInCart = cartQtyByItem.get(it.id) ?? 0;
          const quickAddable = canQuickAdd(it);
          const hasOptions = it.variants.length > 1 || it.modifierGroups.length > 0;
          return (
            <div
              key={it.id}
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              className="group relative flex w-full animate-fade-in flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setPicker(it)}
                className="relative aspect-[4/3] overflow-hidden bg-surface-muted text-left"
                aria-label={`View ${it.name} options`}
              >
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
                <div className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 font-mono text-xs font-semibold shadow-sm backdrop-blur">
                  {def ? formatMoney(def.priceCents) : "—"}
                  {it.variants.length > 1 ? (
                    <span className="ml-1 text-foreground-muted">+{it.variants.length - 1}</span>
                  ) : null}
                </div>
                {qtyInCart > 0 ? (
                  <span className="absolute left-2 top-2 flex h-7 min-w-[28px] animate-scale-in items-center justify-center rounded-full bg-primary px-2 text-xs font-bold leading-none text-primary-foreground shadow-md">
                    {qtyInCart}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(it.id);
                  haptic.light();
                }}
                aria-label={isFavorite(it.id) ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite(it.id)}
                className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground-muted shadow-sm backdrop-blur transition-all hover:scale-110 hover:text-danger active:scale-95"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isFavorite(it.id) ? "fill-danger text-danger" : ""
                  }`}
                />
              </button>

              <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPicker(it)}
                  className="text-left"
                  aria-label={`View ${it.name} options`}
                >
                  <p className="text-sm font-medium leading-tight group-hover:text-primary">
                    {it.name}
                  </p>
                  {it.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">
                      {it.description}
                    </p>
                  ) : null}
                </button>

                {/* Quick add controls — the whole point of the 'feels like a real app' fix */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  {hasOptions ? (
                    <span className="text-[10px] font-medium text-foreground-muted">
                      Customisable
                    </span>
                  ) : (
                    <span />
                  )}

                  {qtyInCart > 0 && quickAddable ? (
                    <div className="flex items-center gap-1 rounded-full bg-primary-subtle p-1">
                      <button
                        type="button"
                        onClick={() => quickDecrement(it)}
                        aria-label="Decrease"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary shadow-sm transition-transform hover:scale-110 active:scale-95"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-7 text-center font-mono text-sm font-bold text-primary">
                        {qtyInCart}
                      </span>
                      <button
                        type="button"
                        onClick={() => quickAdd(it)}
                        aria-label="Increase"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : quickAddable ? (
                    <button
                      type="button"
                      onClick={() => quickAdd(it)}
                      aria-label={`Add ${it.name}`}
                      className="flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicker(it)}
                      className="flex h-9 items-center gap-1 rounded-full border border-primary/40 bg-background px-3 text-xs font-semibold text-primary transition-all hover:bg-primary-subtle"
                    >
                      Choose
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky cart pill — bottom respects iOS safe-area (home indicator) */}
      {cart.length > 0 ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          className="fixed left-1/2 z-20 flex -translate-x-1/2 animate-scale-in items-center gap-3 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg active:scale-[0.97]"
        >
          <ShoppingBag className="h-4 w-4" />
          {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
          <span className="font-mono">{formatMoney(subtotal)}</span>
        </button>
      ) : null}

      {/* Item picker */}
      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-lg">
          {picker ? (
            <ItemPicker
              item={picker}
              extras={props.items
                .filter(
                  (x) =>
                    x.id !== picker.id &&
                    x.variants.length > 0 &&
                    !x.modifierGroups.some((g) => g.required),
                )
                // Prioritise items from a different category (sides / drinks)
                .sort((a, b) => {
                  const aSame = a.categoryId === picker.categoryId ? 1 : 0;
                  const bSame = b.categoryId === picker.categoryId ? 1 : 0;
                  return aSame - bSame;
                })
                .slice(0, 6)}
              onAdd={(lines) => {
                for (const l of lines) addLine(l);
                setPicker(null);
              }}
            />
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
                      <div className="mt-1.5 flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => bumpLine(l.lineKey, -1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center font-mono text-sm font-semibold">{l.quantity}</span>
                        <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => bumpLine(l.lineKey, +1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="ml-auto h-9 w-9 text-foreground-subtle hover:text-danger" onClick={() => removeLine(l.lineKey)}>
                          <Trash2 className="h-4 w-4" />
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
            <Button
              onClick={() => {
                setCartOpen(false);
                setCheckout(true);
              }}
              disabled={cart.length === 0}
            >
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
            {/* Tip selector — table dine-in skips it (tip is at the table). */}
            {props.mode !== "table" ? (
              <FormField>
                <Label>Add a tip</Label>
                <FieldHint>For the kitchen + rider. 100% goes to staff.</FieldHint>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: "None", value: 0 },
                    { label: "5%", value: Math.round(subtotal * 0.05) },
                    { label: "10%", value: Math.round(subtotal * 0.1) },
                    { label: "15%", value: Math.round(subtotal * 0.15) },
                  ].map((opt) => {
                    const active = tipCents === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setTipCents(opt.value);
                          haptic.light();
                        }}
                        className={`flex h-10 flex-col items-center justify-center rounded-md border text-xs font-medium transition-all active:scale-95 ${
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-foreground-muted hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.value > 0 ? (
                          <span className="font-mono text-[10px] opacity-80">
                            {formatMoney(opt.value)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            ) : null}
            {props.mode === "table" ? (
              <p className="text-xs text-foreground-muted">
                Sending to <Badge variant="info" className="ml-1">{props.tableLabel}</Badge>
              </p>
            ) : (
              <p className="text-xs text-foreground-muted">
                Channel: <Badge variant="info" className="ml-1">{channel}</Badge>
              </p>
            )}
            {channel === "DELIVERY" && (props.deliveryFeeCents ?? 0) > 0 ? (
              <p className="text-xs text-foreground-muted">
                Delivery fee:{" "}
                <span className="font-mono">{formatMoney(props.deliveryFeeCents ?? 0)}</span>
              </p>
            ) : null}
            {channel === "DELIVERY" && props.deliveryAreas && props.deliveryAreas.length > 0 ? (
              <p className="text-[11px] text-foreground-muted">
                We deliver to: {props.deliveryAreas.join(", ")}
              </p>
            ) : null}
            {channel === "DELIVERY" && (props.deliveryMinOrderCents ?? 0) > 0 ? (
              <p className="text-[11px] text-foreground-muted">
                Minimum delivery order:{" "}
                <span className="font-mono">{formatMoney(props.deliveryMinOrderCents ?? 0)}</span>
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setCheckout(false)} variant="ghost">Back</Button>
            <Button onClick={submit} loading={submitting}>
              Place order · {formatMoney(subtotal + tipCents)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ItemPicker({
  item,
  extras,
  onAdd,
}: {
  item: PublicItem;
  extras: PublicItem[];
  onAdd: (lines: CartLine[]) => void;
}) {
  const def = item.variants.find((v) => v.isDefault) ?? item.variants[0]!;
  const [variantId, setVariantId] = React.useState(def.id);
  const [selectedMods, setSelectedMods] = React.useState<Record<string, Set<string>>>({});
  const [qty, setQty] = React.useState(1);
  // Map<extraItemId, extraQty>
  const [extraQty, setExtraQty] = React.useState<Record<string, number>>({});

  function bumpExtra(id: string, delta: number) {
    setExtraQty((prev) => {
      const next = { ...prev };
      next[id] = Math.max(0, (next[id] ?? 0) + delta);
      if (next[id] === 0) delete next[id];
      return next;
    });
  }

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
  const mainLineTotal =
    (variant.priceCents + modList.reduce((s, m) => s + m.priceDeltaCents, 0)) * qty;

  // Total for all selected extras
  const extrasTotal = Object.entries(extraQty).reduce((sum, [id, n]) => {
    const ex = extras.find((x) => x.id === id);
    if (!ex || n === 0) return sum;
    const v = ex.variants.find((v) => v.isDefault) ?? ex.variants[0];
    return sum + (v ? v.priceCents * n : 0);
  }, 0);

  const total = mainLineTotal + extrasTotal;

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

        {/* EXTRAS — upsell drinks, sides, sauces in the same modal */}
        {extras.length > 0 ? (
          <div className="rounded-xl border border-primary/30 bg-primary-subtle/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Plus className="h-3 w-3" />
              Add something extra?
            </p>
            <ul className="space-y-1.5">
              {extras.map((ex) => {
                const v = ex.variants.find((x) => x.isDefault) ?? ex.variants[0];
                if (!v) return null;
                const n = extraQty[ex.id] ?? 0;
                return (
                  <li
                    key={ex.id}
                    className="flex items-center gap-2 rounded-lg bg-background p-2 transition-colors"
                  >
                    {ex.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.photoUrl}
                        alt=""
                        className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-muted">
                        <ImageIcon className="h-4 w-4 text-foreground-subtle" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ex.name}</p>
                      <p className="font-mono text-xs text-foreground-muted">
                        {formatMoney(v.priceCents)}
                      </p>
                    </div>
                    {n > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => bumpExtra(ex.id, -1)}
                          aria-label="Decrease"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-foreground transition-colors hover:bg-border active:scale-95"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-7 text-center font-mono text-sm font-semibold">{n}</span>
                        <button
                          type="button"
                          onClick={() => bumpExtra(ex.id, 1)}
                          aria-label="Increase"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => bumpExtra(ex.id, 1)}
                        className="flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
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
            const lines: CartLine[] = [
              {
                lineKey: lineKey(variant.id, modIds),
                menuItemId: item.id,
                variantId: variant.id,
                itemNameSnap: item.name,
                variantNameSnap: variant.name,
                unitPriceCents: variant.priceCents,
                quantity: qty,
                modifiers: modList,
              },
            ];
            // Append each selected extra as its own cart line
            for (const [id, n] of Object.entries(extraQty)) {
              if (n <= 0) continue;
              const ex = extras.find((x) => x.id === id);
              if (!ex) continue;
              const v = ex.variants.find((x) => x.isDefault) ?? ex.variants[0];
              if (!v) continue;
              lines.push({
                lineKey: lineKey(v.id, []),
                menuItemId: ex.id,
                variantId: v.id,
                itemNameSnap: ex.name,
                variantNameSnap: v.name,
                unitPriceCents: v.priceCents,
                quantity: n,
                modifiers: [],
              });
            }
            onAdd(lines);
          }}
        >
          Add · {formatMoney(total)}
        </Button>
      </DialogFooter>
    </>
  );
}
