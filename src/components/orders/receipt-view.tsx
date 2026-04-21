"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, MessageCircle, Printer, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lineKey, type CartLine } from "@/lib/orders/cart";
import { haptic } from "@/lib/ui/haptics";
import { formatMoney } from "@/lib/utils";

type ReceiptItem = {
  qty: number;
  name: string;
  variant: string;
  modifiers: { name: string; priceCents: number }[];
  notes: string | null;
  lineTotalCents: number;
  // Optional fields needed for "reorder" — when present, ReceiptView can
  // rebuild a cart and bounce the customer back to the menu with it
  // pre-loaded.
  variantId?: string;
  menuItemId?: string;
  unitPriceCents?: number;
  variantName?: string;
  modifierIds?: string[];
};

export type ReceiptOrder = {
  id: string;
  orderNumber: number;
  channel: string;
  status: string;
  tableLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  notes: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  serviceCents: number;
  tipCents: number;
  deliveryChargeCents: number;
  totalCents: number;
  items: ReceiptItem[];
  payments: { method: string; amountCents: number; at: string }[];
};

export type ReceiptTenant = {
  name: string;
  phone: string | null;
  logoUrl: string | null;
  currency: string;
};

export function ReceiptView({
  order,
  tenant,
  branch,
  reorderSlug,
}: {
  order: ReceiptOrder;
  tenant: ReceiptTenant;
  branch: { name: string; address: string } | null;
  /** When set, render a "Reorder" button that pre-loads the cart and
   *  navigates to /r/{slug}/menu. */
  reorderSlug?: string;
}) {
  const router = useRouter();

  // Rebuild cart lines from receipt items + drop into localStorage so the
  // menu screen hydrates with this cart when it mounts. Lines that don't
  // carry variant snapshots (legacy receipts) are skipped — their absence
  // is rare and the menu would have rejected them anyway.
  function reorder() {
    if (!reorderSlug) return;
    const lines: CartLine[] = order.items
      .filter((it) => it.variantId && it.menuItemId && it.unitPriceCents != null)
      .map((it) => ({
        lineKey: lineKey(it.variantId!, it.modifierIds ?? []),
        menuItemId: it.menuItemId!,
        variantId: it.variantId!,
        itemNameSnap: it.name,
        variantNameSnap: it.variantName ?? it.variant,
        unitPriceCents: it.unitPriceCents!,
        quantity: it.qty,
        notes: it.notes ?? "",
        // Modifiers without snapshot ids are dropped — server will re-price.
        modifiers: [],
      }));
    if (lines.length === 0) return;
    try {
      window.localStorage.setItem(`easymenu:cart:v1:${reorderSlug}`, JSON.stringify(lines));
    } catch {
      /* quota / private mode — fall through to navigate */
    }
    haptic.success();
    router.push(`/r/${reorderSlug}/menu`);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${order.orderNumber} — ${tenant.name}`,
          url,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert("Receipt link copied.");
    } catch {
      /* ignore */
    }
  }

  // Build a plain-text WhatsApp summary. wa.me opens the user's WhatsApp
  // with this message prefilled — they pick the recipient.
  function whatsappShare() {
    const lines: string[] = [];
    lines.push(`*${tenant.name}* — Receipt #${order.orderNumber.toString().padStart(4, "0")}`);
    lines.push(new Date(order.createdAt).toLocaleString());
    lines.push("");
    for (const it of order.items) {
      lines.push(`${it.qty}× ${it.name}${it.variant ? ` (${it.variant})` : ""} — ${formatMoney(it.lineTotalCents)}`);
      for (const m of it.modifiers) lines.push(`   + ${m.name}`);
    }
    lines.push("");
    if (order.taxCents > 0) lines.push(`Tax: ${formatMoney(order.taxCents)}`);
    if (order.deliveryChargeCents > 0) lines.push(`Delivery: ${formatMoney(order.deliveryChargeCents)}`);
    lines.push(`*Total: ${formatMoney(order.totalCents)}*`);
    lines.push("");
    lines.push(`Receipt: ${window.location.href}`);
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-md py-6 print:py-0">
      <div className="print:hidden mb-4 flex flex-wrap items-center justify-end gap-2 px-4">
        {reorderSlug ? (
          <Button size="sm" onClick={reorder}>
            <RotateCcw className="h-4 w-4" /> Reorder
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={whatsappShare}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
        <Button variant="secondary" size="sm" onClick={share}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4" /> Save PDF
        </Button>
      </div>

      <article className="mx-4 rounded-2xl bg-background p-5 font-mono text-sm shadow-sm print:mx-0 print:rounded-none print:p-4 print:shadow-none">
        <header className="border-b border-dashed border-border pb-3 text-center">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logoUrl}
              alt=""
              aria-hidden
              className="mx-auto mb-2 h-12 w-12 rounded-md object-cover"
            />
          ) : null}
          <p className="text-base font-bold uppercase">{tenant.name}</p>
          {branch ? (
            <>
              <p className="text-xs text-foreground-muted">{branch.name}</p>
              {branch.address ? (
                <p className="text-[11px] text-foreground-muted">{branch.address}</p>
              ) : null}
            </>
          ) : null}
          {tenant.phone ? <p className="text-xs text-foreground-muted">{tenant.phone}</p> : null}
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-dashed border-border py-2 text-xs">
          <div>
            <p className="text-foreground-muted">Order #</p>
            <p className="font-bold">{order.orderNumber.toString().padStart(4, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-foreground-muted">Date</p>
            <p>{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Channel</p>
            <p>{order.channel}</p>
          </div>
          <div className="text-right">
            <p className="text-foreground-muted">Status</p>
            <p>{order.status}</p>
          </div>
          {order.customerName ? (
            <div className="col-span-2">
              <p className="text-foreground-muted">Customer</p>
              <p>
                {order.customerName}
                {order.customerPhone ? ` · ${order.customerPhone}` : ""}
              </p>
            </div>
          ) : null}
          {order.tableLabel ? (
            <div className="col-span-2">
              <p className="text-foreground-muted">Table</p>
              <p>{order.tableLabel}</p>
            </div>
          ) : null}
          {order.deliveryAddress ? (
            <div className="col-span-2">
              <p className="text-foreground-muted">Deliver to</p>
              <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
            </div>
          ) : null}
        </div>

        <ul className="divide-y divide-dashed divide-border py-2">
          {order.items.map((it, i) => (
            <li key={i} className="py-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {it.qty}× {it.name}
                    {it.variant ? ` · ${it.variant}` : ""}
                  </p>
                  {it.modifiers.length > 0 ? (
                    <ul className="mt-0.5 pl-3 text-foreground-muted">
                      {it.modifiers.map((m, j) => (
                        <li key={j}>
                          + {m.name}
                          {m.priceCents > 0 ? ` (${formatMoney(m.priceCents)})` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {it.notes ? <p className="mt-0.5 italic text-foreground-muted">" {it.notes} "</p> : null}
                </div>
                <p className="flex-shrink-0 font-semibold">{formatMoney(it.lineTotalCents)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-0.5 border-t border-dashed border-border pt-2 text-xs">
          <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
          {order.discountCents > 0 ? (
            <Row label="Discount" value={`- ${formatMoney(order.discountCents)}`} />
          ) : null}
          {order.taxCents > 0 ? <Row label="Tax" value={formatMoney(order.taxCents)} /> : null}
          {order.serviceCents > 0 ? (
            <Row label="Service" value={formatMoney(order.serviceCents)} />
          ) : null}
          {order.deliveryChargeCents > 0 ? (
            <Row label="Delivery" value={formatMoney(order.deliveryChargeCents)} />
          ) : null}
          {order.tipCents > 0 ? <Row label="Tip" value={formatMoney(order.tipCents)} /> : null}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <span>TOTAL</span>
            <span>{formatMoney(order.totalCents)}</span>
          </div>
        </div>

        {order.payments.length > 0 ? (
          <div className="mt-3 border-t border-dashed border-border pt-2 text-xs">
            <p className="text-foreground-muted">Paid</p>
            {order.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{p.method}</span>
                <span>{formatMoney(p.amountCents)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {order.notes ? (
          <div className="mt-3 border-t border-dashed border-border pt-2 text-xs">
            <p className="text-foreground-muted">Notes</p>
            <p className="whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}

        <footer className="mt-4 border-t border-dashed border-border pt-3 text-center text-[11px] text-foreground-muted">
          Thank you — come back soon!
          <br />
          Receipt ID {order.id.slice(-8).toUpperCase()}
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          /* Page chrome (header/nav/footer) hidden by container layout */
          html, body {
            background: #fff !important;
            color: #000 !important;
          }
          /* Hide anything that isn't part of the receipt block */
          header, nav, footer, aside, [data-print-hide] {
            display: none !important;
          }
          /* Black-on-white for crisp ink */
          article {
            color: #000 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
          @page {
            margin: 8mm;
            size: A5 portrait;
          }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-foreground-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
