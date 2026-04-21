"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Crown, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import {
  requestPlanUpgradeSchema,
  type RequestPlanUpgradeInput,
} from "@/lib/validations/billing.schema";
import { requestPlanUpgradeAction } from "@/server/actions/billing.actions";

type PlanOption = {
  code: string;
  name: string;
  tagline: string | null;
  interval: "MONTH" | "YEAR" | "LIFETIME";
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
};

function formatPkr(paisa: number): string {
  return `Rs ${Math.round(paisa / 100).toLocaleString("en-PK")}`;
}

export function UpgradeDialog({
  slug,
  currentPlanCode,
  plans,
}: {
  slug: string;
  currentPlanCode: string;
  plans: PlanOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PlanOption | null>(null);
  const [step, setStep] = React.useState<"pick" | "pay">("pick");

  const upgradable = plans.filter((p) => p.code !== currentPlanCode && p.code !== "trial");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<RequestPlanUpgradeInput>({
    resolver: zodResolver(requestPlanUpgradeSchema),
    mode: "onBlur",
    defaultValues: {
      targetPlanCode: "",
      method: "BANK",
      reference: "",
      screenshotUrl: "",
      notes: "",
    },
  });

  function pick(p: PlanOption) {
    setSelected(p);
    reset({
      targetPlanCode: p.code,
      method: "BANK",
      reference: "",
      screenshotUrl: "",
      notes: "",
    });
    setStep("pay");
  }

  const [submitting, setSubmitting] = React.useState(false);
  async function onSubmit(values: RequestPlanUpgradeInput) {
    setSubmitting(true);
    const res = await requestPlanUpgradeAction(slug, values);
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't submit", description: res.error });
      return;
    }
    toast({
      variant: "success",
      title: "Payment submitted",
      description: "We'll verify your payment and activate your plan within 24 hours.",
    });
    setOpen(false);
    setStep("pick");
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Upgrade plan <ArrowRight className="h-4 w-4" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setStep("pick");
            setSelected(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {step === "pick" ? (
            <>
              <DialogHeader>
                <DialogTitle>Upgrade your plan</DialogTitle>
                <DialogDescription>
                  Pick a plan below. Next step will ask for payment proof — we
                  activate your plan after verification.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {upgradable.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => pick(p)}
                    className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-subtle text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        {p.code === "starter" ? <Zap className="h-4 w-4" /> :
                         p.code === "growth" ? <Sparkles className="h-4 w-4" /> :
                         <Crown className="h-4 w-4" />}
                      </span>
                      {p.interval === "LIFETIME" ? (
                        <Badge variant="primary">Lifetime</Badge>
                      ) : null}
                    </div>
                    <p className="font-semibold">{p.name}</p>
                    {p.tagline ? (
                      <p className="text-xs text-primary">{p.tagline}</p>
                    ) : null}
                    <div className="flex items-baseline gap-1">
                      <p className="font-mono text-xl font-bold">{formatPkr(p.priceCents)}</p>
                      <p className="text-xs text-foreground-muted">
                        {p.interval === "LIFETIME" ? "one-time" : "/ month"}
                      </p>
                    </div>
                    {p.compareAtPriceCents && p.compareAtPriceCents > p.priceCents ? (
                      <p className="font-mono text-xs text-foreground-muted line-through">
                        {formatPkr(p.compareAtPriceCents)}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === "pay" && selected ? (
            <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Pay for {selected.name}</DialogTitle>
                <DialogDescription>
                  Send the payment and upload proof below. We verify within 24 hours.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{selected.name}</span>
                    <span className="text-foreground-muted">
                      {" · "}
                      {selected.interval === "LIFETIME" ? "Lifetime" : "Monthly"}
                    </span>
                  </p>
                  <p className="font-mono font-bold">{formatPkr(selected.priceCents)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
                <p className="font-medium text-primary">Bank / wallet details</p>
                <ul className="mt-1 space-y-0.5 text-foreground-muted">
                  <li><strong>Bank:</strong> Meezan Bank · EasyMenu (Pvt) Ltd · 00123456789</li>
                  <li><strong>JazzCash:</strong> 0300-0000000</li>
                  <li><strong>Easypaisa:</strong> 0345-0000000</li>
                </ul>
                <p className="mt-2 text-foreground-muted">
                  After sending, enter the reference ID and screenshot URL below.
                </p>
              </div>

              <input type="hidden" {...register("targetPlanCode")} />

              <FormField>
                <Label htmlFor="method" required>Payment method</Label>
                <select
                  id="method"
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  {...register("method")}
                >
                  <option value="BANK">Bank transfer</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">Easypaisa</option>
                  <option value="CARD">Card (contact us)</option>
                </select>
              </FormField>

              <FormField>
                <Label htmlFor="reference">Transaction ID / reference</Label>
                <Input id="reference" placeholder="e.g. TXN12345678" {...register("reference")} />
                <FieldHint>From your bank SMS / wallet app.</FieldHint>
              </FormField>

              <FormField>
                <Label htmlFor="screenshotUrl">Screenshot URL</Label>
                <Input
                  id="screenshotUrl"
                  placeholder="https://…"
                  invalid={!!errors.screenshotUrl}
                  {...register("screenshotUrl")}
                />
                <FieldHint>Upload screenshot to imgur / drive, paste the URL.</FieldHint>
                <FieldError message={errors.screenshotUrl?.message} />
              </FormField>

              <FormField>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" {...register("notes")} />
              </FormField>

              <div className="flex justify-between gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={() => setStep("pick")}>
                  Back
                </Button>
                <Button type="submit" loading={submitting} disabled={!isValid}>
                  Submit payment proof
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
