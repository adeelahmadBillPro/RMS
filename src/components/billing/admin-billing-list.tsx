"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  approvePlanInvoiceAction,
  rejectPlanInvoiceAction,
} from "@/server/actions/billing.actions";
import { useToast } from "@/components/ui/use-toast";

type AdminInvoice = {
  id: string;
  tenantName: string;
  tenantSlug: string;
  planCode: string;
  amountLabel: string;
  method: string;
  reference: string | null;
  screenshotUrl: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export function AdminBillingList({ invoices }: { invoices: AdminInvoice[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function approve(i: AdminInvoice) {
    setBusy(i.id);
    const res = await approvePlanInvoiceAction(i.id);
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't approve", description: res.error });
      return;
    }
    toast({ variant: "success", title: `Approved ${i.planCode.toUpperCase()} for ${i.tenantName}` });
    router.refresh();
  }

  async function reject(i: AdminInvoice) {
    const reason = prompt(`Reject invoice for ${i.tenantName}? Reason:`);
    if (!reason || reason.length < 2) return;
    setBusy(i.id);
    const res = await rejectPlanInvoiceAction(i.id, reason);
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't reject", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Rejected" });
    router.refresh();
  }

  return (
    <ul className="divide-y divide-border">
      {invoices.map((i) => (
        <li key={i.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{i.tenantName}</p>
              <p className="text-xs text-foreground-muted">
                {new Date(i.createdAt).toLocaleString()}
                {" · "}
                <span className="uppercase">{i.planCode}</span>
                {" · "}
                {i.method}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{i.amountLabel}</span>
              <Badge variant="warning">{i.status}</Badge>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-1 rounded-xl border border-border bg-surface p-3 text-xs md:grid-cols-2">
            <div>
              <dt className="text-foreground-muted">Reference</dt>
              <dd className="font-mono">{i.reference || "—"}</dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Screenshot</dt>
              <dd>
                {i.screenshotUrl ? (
                  <a
                    href={i.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-foreground-muted">—</span>
                )}
              </dd>
            </div>
            {i.notes ? (
              <div className="md:col-span-2">
                <dt className="text-foreground-muted">Notes</dt>
                <dd className="whitespace-pre-wrap">{i.notes}</dd>
              </div>
            ) : null}
          </dl>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => reject(i)} loading={busy === i.id}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button size="sm" onClick={() => approve(i)} loading={busy === i.id}>
              <Check className="h-4 w-4" /> Approve & activate
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
