"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { lookupGuestOrder } from "@/server/actions/public-order-lookup.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";

export function GuestTrackForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await lookupGuestOrder({ slug, orderNumber, phone });
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.push(`/r/${slug}/order/${res.orderId}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="orderNumber" required>
          Order number
        </Label>
        <Input
          id="orderNumber"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 1042"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        <FieldError message={undefined} />
      </FormField>

      <FormField>
        <Label htmlFor="phone" required>
          Phone number
        </Label>
        <Input
          id="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 03001234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-foreground-subtle">
          The phone you entered when placing the order.
        </p>
      </FormField>

      <Button type="submit" className="w-full" loading={submitting}>
        {submitting ? "Looking up…" : "Find my order"}
      </Button>
    </form>
  );
}
