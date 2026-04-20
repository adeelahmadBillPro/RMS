/**
 * POS cart math — single source of truth for line totals & order totals.
 * All amounts in paisa (Int).
 */

export type CartModifier = {
  modifierId: string;
  modifierNameSnap: string;
  priceDeltaCents: number;
};

export type CartLine = {
  lineKey: string; // client-side dedupe key (variantId + sorted modifier ids)
  menuItemId: string;
  variantId: string;
  itemNameSnap: string;
  variantNameSnap: string;
  unitPriceCents: number;
  quantity: number;
  notes?: string;
  modifiers: CartModifier[];
};

export function lineTotalCents(line: CartLine): number {
  const modSum = line.modifiers.reduce((s, m) => s + m.priceDeltaCents, 0);
  return (line.unitPriceCents + modSum) * line.quantity;
}

export function subtotalCents(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + lineTotalCents(l), 0);
}

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  serviceCents: number;
  tipCents: number;
  deliveryChargeCents: number;
  totalCents: number;
};

export type TotalsInput = {
  lines: CartLine[];
  taxBps: number; // 1700 = 17.00%
  serviceBps: number;
  discountCents?: number;
  tipCents?: number;
  deliveryChargeCents?: number;
};

export function computeTotals(input: TotalsInput): Totals {
  const sub = subtotalCents(input.lines);
  const discount = Math.min(input.discountCents ?? 0, sub);
  const taxable = Math.max(0, sub - discount);
  const tax = Math.round((taxable * input.taxBps) / 10_000);
  const service = Math.round((taxable * input.serviceBps) / 10_000);
  const tip = input.tipCents ?? 0;
  const delivery = input.deliveryChargeCents ?? 0;
  return {
    subtotalCents: sub,
    discountCents: discount,
    taxableCents: taxable,
    taxCents: tax,
    serviceCents: service,
    tipCents: tip,
    deliveryChargeCents: delivery,
    totalCents: taxable + tax + service + tip + delivery,
  };
}

/** Build the dedupe key for two lines: same variant + same modifier set merge. */
export function lineKey(variantId: string, modifierIds: string[]): string {
  return `${variantId}::${[...modifierIds].sort().join(",")}`;
}
