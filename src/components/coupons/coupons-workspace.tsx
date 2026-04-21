"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Power, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  createCouponSchema,
  type CreateCouponInput,
} from "@/lib/validations/coupon.schema";
import {
  createCouponAction,
  deleteCouponAction,
  setCouponActiveAction,
} from "@/server/actions/coupon.actions";

type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT_OFF" | "FLAT_OFF" | "FREE_DELIVERY";
  percentBps: number | null;
  flatOffCents: number | null;
  maxDiscountCents: number | null;
  minOrderCents: number;
  maxRedemptions: number | null;
  redemptionsCount: number;
  validUntil: string | null;
  isActive: boolean;
};

function fmtRupees(cents: number) {
  return `Rs ${Math.round(cents / 100).toLocaleString("en-PK")}`;
}

function summary(c: CouponRow): string {
  if (c.type === "PERCENT_OFF") {
    const pct = (c.percentBps ?? 0) / 100;
    const cap = c.maxDiscountCents ? ` (max ${fmtRupees(c.maxDiscountCents)})` : "";
    return `${pct.toFixed(0)}% off${cap}`;
  }
  if (c.type === "FLAT_OFF") return `${fmtRupees(c.flatOffCents ?? 0)} off`;
  return "Free delivery";
}

export function CouponsWorkspace({
  slug,
  canManage,
  canDelete,
  coupons,
}: {
  slug: string;
  canManage: boolean;
  canDelete: boolean;
  coupons: CouponRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateCouponInput>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: { type: "PERCENT_OFF", isActive: true, minOrderRupees: 0 },
  });
  const type = watch("type");

  const [submitting, setSubmitting] = React.useState(false);
  async function onSubmit(values: CreateCouponInput) {
    setSubmitting(true);
    const res = await createCouponAction(slug, values);
    setSubmitting(false);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [k, v] of Object.entries(res.fieldErrors)) {
          setError(k as keyof CreateCouponInput, { message: v });
        }
      } else {
        toast({ variant: "danger", title: "Couldn’t create", description: res.error });
      }
      return;
    }
    toast({ variant: "success", title: `Coupon ${values.code.toUpperCase()} created` });
    reset({ type: "PERCENT_OFF", isActive: true, minOrderRupees: 0 });
    setOpen(false);
    router.refresh();
  }

  async function toggle(c: CouponRow) {
    setBusy(c.id);
    const res = await setCouponActiveAction(slug, c.id, !c.isActive);
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t update", description: res.error });
      return;
    }
    toast({ variant: "success", title: c.isActive ? `Disabled ${c.code}` : `Enabled ${c.code}` });
    router.refresh();
  }

  async function remove(c: CouponRow) {
    if (!confirm(`Delete coupon ${c.code}? This can’t be undone.`)) return;
    setBusy(c.id);
    const res = await deleteCouponAction(slug, c.id);
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
      return;
    }
    toast({ variant: "success", title: `${c.code} deleted` });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            {coupons.length} coupon{coupons.length === 1 ? "" : "s"} ·{" "}
            {coupons.filter((c) => c.isActive).length} active
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        </div>
      ) : null}

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <Tag className="h-5 w-5" />
          </div>
          <p className="mt-3 text-h3">No coupons yet</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Create your first promo code to drive repeat orders.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-surface-muted px-2 py-1 font-mono text-sm font-bold">
                    {c.code}
                  </span>
                  <Badge variant={c.isActive ? "success" : "neutral"}>
                    {c.isActive ? "Active" : "Disabled"}
                  </Badge>
                  <span className="text-sm font-medium text-foreground-muted">{summary(c)}</span>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  {c.minOrderCents > 0 ? `Min order ${fmtRupees(c.minOrderCents)} · ` : ""}
                  {c.redemptionsCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""} used
                  {c.validUntil ? ` · until ${new Date(c.validUntil).toLocaleDateString()}` : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === c.id}
                    onClick={() => toggle(c)}
                    aria-label={c.isActive ? "Disable coupon" : "Enable coupon"}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  {canDelete ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === c.id}
                      onClick={() => remove(c)}
                      aria-label="Delete coupon"
                      className="text-foreground-subtle hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New coupon</DialogTitle>
              <DialogDescription>
                Customers enter the code at checkout. Discount is recomputed
                server-side, so they can’t cheat the cap.
              </DialogDescription>
            </DialogHeader>
            <FormField>
              <Label htmlFor="coupon-code" required>Code</Label>
              <Input
                id="coupon-code"
                placeholder="WELCOME10"
                invalid={!!errors.code}
                {...register("code")}
              />
              <FieldHint>3–20 chars · letters, numbers, _ or -</FieldHint>
              <FieldError message={errors.code?.message} />
            </FormField>

            <FormField>
              <Label htmlFor="coupon-type" required>Type</Label>
              <select
                id="coupon-type"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                {...register("type")}
              >
                <option value="PERCENT_OFF">Percent off</option>
                <option value="FLAT_OFF">Flat amount off</option>
                <option value="FREE_DELIVERY">Free delivery</option>
              </select>
            </FormField>

            {type === "PERCENT_OFF" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <FormField>
                  <Label htmlFor="coupon-percent" required>Percent</Label>
                  <Input
                    id="coupon-percent"
                    type="number"
                    min={1}
                    max={100}
                    invalid={!!errors.percent}
                    {...register("percent")}
                  />
                  <FieldError message={errors.percent?.message} />
                </FormField>
                <FormField>
                  <Label htmlFor="coupon-cap">Cap discount at (Rs)</Label>
                  <Input
                    id="coupon-cap"
                    type="number"
                    min={0}
                    placeholder="Optional"
                    invalid={!!errors.maxDiscountRupees}
                    {...register("maxDiscountRupees")}
                  />
                  <FieldError message={errors.maxDiscountRupees?.message} />
                </FormField>
              </div>
            ) : null}

            {type === "FLAT_OFF" ? (
              <FormField>
                <Label htmlFor="coupon-flat" required>Amount (Rs)</Label>
                <Input
                  id="coupon-flat"
                  type="number"
                  min={1}
                  invalid={!!errors.flatRupees}
                  {...register("flatRupees")}
                />
                <FieldError message={errors.flatRupees?.message} />
              </FormField>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <FormField>
                <Label htmlFor="coupon-min">Min order (Rs)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min={0}
                  defaultValue={0}
                  {...register("minOrderRupees")}
                />
              </FormField>
              <FormField>
                <Label htmlFor="coupon-max">Max redemptions</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  {...register("maxRedemptions")}
                />
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create coupon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
