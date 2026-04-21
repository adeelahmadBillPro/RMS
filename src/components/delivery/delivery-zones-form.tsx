"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { updateDeliveryZonesAction } from "@/server/actions/delivery-zones.actions";

type Initial = {
  deliveryAreas: string[];
  deliveryFeeRupees: number;
  deliveryMinOrderRupees: number;
  deliveryRadiusKm: number | null;
};

export function DeliveryZonesForm({
  slug,
  canManage,
  initial,
}: {
  slug: string;
  canManage: boolean;
  initial: Initial;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [areas, setAreas] = React.useState<string[]>(initial.deliveryAreas);
  const [newArea, setNewArea] = React.useState("");
  const [fee, setFee] = React.useState<number>(initial.deliveryFeeRupees);
  const [minOrder, setMinOrder] = React.useState<number>(initial.deliveryMinOrderRupees);
  const [radius, setRadius] = React.useState<number | "">(initial.deliveryRadiusKm ?? "");
  const [saving, setSaving] = React.useState(false);

  function addArea() {
    const v = newArea.trim();
    if (!v) return;
    if (areas.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setNewArea("");
      return;
    }
    if (areas.length >= 40) {
      toast({ variant: "warning", title: "Max 40 areas" });
      return;
    }
    setAreas((prev) => [...prev, v]);
    setNewArea("");
  }

  function removeArea(a: string) {
    setAreas((prev) => prev.filter((x) => x !== a));
  }

  async function save() {
    setSaving(true);
    const res = await updateDeliveryZonesAction(slug, {
      deliveryAreas: areas,
      deliveryFeeRupees: Number(fee) || 0,
      deliveryMinOrderRupees: Number(minOrder) || 0,
      deliveryRadiusKm: radius === "" ? null : Number(radius),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Delivery settings saved" });
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-background p-4">
      <FormField>
        <Label>Delivery areas</Label>
        <FieldHint>
          List the areas / localities you deliver to. A customer's address must
          contain at least one of these words. Leave empty to deliver anywhere.
        </FieldHint>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {areas.length === 0 ? (
            <span className="text-xs italic text-foreground-muted">
              No areas yet — delivering anywhere.
            </span>
          ) : (
            areas.map((a) => (
              <Badge key={a} variant="neutral" className="gap-1 pr-1">
                {a}
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => removeArea(a)}
                    className="rounded-full p-0.5 hover:bg-background"
                    aria-label={`Remove ${a}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            ))
          )}
        </div>
        {canManage ? (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="e.g. DHA, Gulberg, Model Town"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addArea();
                }
              }}
            />
            <Button type="button" size="sm" variant="secondary" onClick={addArea}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        ) : null}
      </FormField>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField>
          <Label htmlFor="fee">Delivery fee (PKR)</Label>
          <Input
            id="fee"
            type="number"
            min={0}
            disabled={!canManage}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
          <FieldHint>Flat fee applied to delivery orders.</FieldHint>
        </FormField>
        <FormField>
          <Label htmlFor="min">Minimum delivery order (PKR)</Label>
          <Input
            id="min"
            type="number"
            min={0}
            disabled={!canManage}
            value={minOrder}
            onChange={(e) => setMinOrder(Number(e.target.value))}
          />
          <FieldHint>Block delivery orders below this subtotal.</FieldHint>
        </FormField>
        <FormField>
          <Label htmlFor="radius">Radius (km · optional)</Label>
          <Input
            id="radius"
            type="number"
            step="0.1"
            min={0}
            disabled={!canManage}
            value={radius}
            onChange={(e) => setRadius(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <FieldHint>Reserved for future geocoded distance checks.</FieldHint>
        </FormField>
      </div>

      {canManage ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={save} loading={saving}>
            Save delivery settings
          </Button>
        </div>
      ) : null}
    </div>
  );
}
