"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Landmark, ShoppingBag, Smartphone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { TenantChannelsInput } from "@/lib/validations/tenant-settings.schema";
import { updateTenantChannelsAction } from "@/server/actions/tenant-settings.actions";

function Toggle({
  label,
  desc,
  icon,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  icon: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
        checked ? "border-primary/60 bg-primary/5" : "border-border bg-background"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary/40"}`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
          checked ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground-muted"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-foreground-muted">{desc}</p>
      </div>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function TenantChannelsForm({
  slug,
  canManage,
  initial,
}: {
  slug: string;
  canManage: boolean;
  initial: TenantChannelsInput;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = React.useState<TenantChannelsInput>(initial);
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof TenantChannelsInput>(k: K) => (v: boolean) =>
    setState((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await updateTenantChannelsAction(slug, state);
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Channels & payments saved" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-background p-4">
        <header className="mb-3">
          <h3 className="text-sm font-semibold">Order channels</h3>
          <p className="text-xs text-foreground-muted">
            Keep at least one enabled. Dine-in via QR is always on.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            label="Takeaway / Pickup"
            desc="Customers order, come and pick up."
            icon={<ShoppingBag className="h-5 w-5" />}
            checked={state.hasTakeaway}
            disabled={!canManage}
            onChange={set("hasTakeaway")}
          />
          <Toggle
            label="Delivery"
            desc="Rider delivers to customer address."
            icon={<Truck className="h-5 w-5" />}
            checked={state.hasDelivery}
            disabled={!canManage}
            onChange={set("hasDelivery")}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <header className="mb-3">
          <h3 className="text-sm font-semibold">Payment methods</h3>
          <p className="text-xs text-foreground-muted">
            Enable what you accept. Customers see these at checkout.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            label="Cash"
            desc="Pay at the counter or to the rider."
            icon={<Banknote className="h-5 w-5" />}
            checked={state.acceptCash}
            disabled={!canManage}
            onChange={set("acceptCash")}
          />
          <Toggle
            label="Card (POS terminal)"
            desc="Debit / credit via card machine."
            icon={<CreditCard className="h-5 w-5" />}
            checked={state.acceptCard}
            disabled={!canManage}
            onChange={set("acceptCard")}
          />
          <Toggle
            label="JazzCash"
            desc="Mobile wallet transfer."
            icon={<Smartphone className="h-5 w-5" />}
            checked={state.acceptJazzCash}
            disabled={!canManage}
            onChange={set("acceptJazzCash")}
          />
          <Toggle
            label="Easypaisa"
            desc="Mobile wallet transfer."
            icon={<Smartphone className="h-5 w-5" />}
            checked={state.acceptEasypaisa}
            disabled={!canManage}
            onChange={set("acceptEasypaisa")}
          />
          <Toggle
            label="Bank transfer"
            desc="Direct account-to-account."
            icon={<Landmark className="h-5 w-5" />}
            checked={state.acceptBankTransfer}
            disabled={!canManage}
            onChange={set("acceptBankTransfer")}
          />
        </div>
      </section>

      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
