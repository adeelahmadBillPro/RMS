"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Image as ImageIcon,
  Pencil,
  Percent,
  Plus,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  createDealAction,
  deleteDealAction,
  updateDealAction,
} from "@/server/actions/deal.actions";
import { dealCreateSchema, type DealCreateInput } from "@/lib/validations/deal.schema";
import { cn, formatMoney } from "@/lib/utils";

export type DealRow = {
  id: string;
  title: string;
  subtitle: string | null;
  type: "PERCENT_OFF" | "FLAT_OFF" | "FREE_DELIVERY";
  percentBps: number | null;
  flatOffCents: number | null;
  minOrderCents: number;
  heroImageUrl: string | null;
  bgColor: string | null;
  ctaLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

function dealValueLabel(d: DealRow): string {
  if (d.type === "PERCENT_OFF") return `${((d.percentBps ?? 0) / 100).toFixed(0)}% off`;
  if (d.type === "FLAT_OFF") return `${formatMoney(d.flatOffCents ?? 0)} off`;
  return "Free delivery";
}

function DealIcon({ type }: { type: DealRow["type"] }) {
  if (type === "PERCENT_OFF") return <Percent className="h-4 w-4" />;
  if (type === "FREE_DELIVERY") return <Truck className="h-4 w-4" />;
  return <Tag className="h-4 w-4" />;
}

function formatRange(d: DealRow): string {
  const s = new Date(d.startsAt).toLocaleDateString();
  if (!d.endsAt) return `From ${s}`;
  return `${s} → ${new Date(d.endsAt).toLocaleDateString()}`;
}

export function DealsWorkspace({
  slug,
  canManage,
  canDelete,
  deals,
}: {
  slug: string;
  canManage: boolean;
  canDelete: boolean;
  deals: DealRow[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<DealRow | null>(null);

  async function handleDelete(d: DealRow) {
    if (!confirm(`Delete deal "${d.title}"?`)) return;
    const res = await deleteDealAction(slug, { id: d.id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn't delete", description: res.error });
    else {
      toast({ variant: "success", title: "Deleted" });
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {deals.length} deal{deals.length === 1 ? "" : "s"}
        </p>
        {canManage ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add deal
          </Button>
        ) : null}
      </div>

      {deals.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-5 w-5" />}
          title="No deals yet"
          description="Create your first banner — e.g. 10% off on orders over Rs 1000."
          action={canManage ? <Button onClick={() => setCreating(true)}>Create a deal</Button> : null}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {deals.map((d) => (
            <article
              key={d.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                d.isActive ? "border-border" : "border-dashed border-border opacity-70",
              )}
            >
              <div
                className="relative h-32 bg-gradient-to-br from-primary via-primary to-primary-hover text-primary-foreground"
                style={d.bgColor ? { background: d.bgColor } : undefined}
              >
                {d.heroImageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.heroImageUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover opacity-50"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-foreground/50"
                    />
                  </>
                ) : null}
                <div className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" className="bg-white/90 text-primary">
                      <DealIcon type={d.type} />
                      {dealValueLabel(d)}
                    </Badge>
                    <Badge variant={d.isActive ? "success" : "neutral"} className="bg-white/90">
                      {d.isActive ? "Live" : "Paused"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight drop-shadow">{d.title}</p>
                    {d.subtitle ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/90 drop-shadow">
                        {d.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="text-xs text-foreground-muted">
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatRange(d)}
                  </p>
                  {d.minOrderCents > 0 ? (
                    <p className="mt-0.5">
                      Min: <span className="font-mono">{formatMoney(d.minOrderCents)}</span>
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(d)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(d)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New deal</DialogTitle>
            <DialogDescription>
              Runs on your customer site until the end date (or indefinitely).
            </DialogDescription>
          </DialogHeader>
          <DealForm slug={slug} initial={null} onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit deal</DialogTitle>
          </DialogHeader>
          {editing ? (
            <DealForm slug={slug} initial={editing} onDone={() => setEditing(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DealForm({
  slug,
  initial,
  onDone,
}: {
  slug: string;
  initial: DealRow | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const isEdit = !!initial;
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  type FormShape = DealCreateInput & { id?: string };
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(dealCreateSchema),
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      title: initial?.title ?? "",
      subtitle: initial?.subtitle ?? "",
      type: initial?.type ?? "PERCENT_OFF",
      percentBps: initial?.percentBps ?? 10,
      flatOffRupees:
        initial?.flatOffCents != null ? initial.flatOffCents / 100 : 100,
      minOrderRupees: initial ? initial.minOrderCents / 100 : 0,
      heroImageUrl: initial?.heroImageUrl ?? "",
      bgColor: initial?.bgColor ?? "",
      ctaLabel: initial?.ctaLabel ?? "Order now",
      startsAt: initial?.startsAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endsAt: initial?.endsAt?.slice(0, 10) ?? "",
      isActive: initial?.isActive ?? true,
      sortOrder: initial?.sortOrder ?? 0,
    },
  });
  const type = watch("type");

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const res = isEdit
      ? await updateDealAction(slug, values)
      : await createDealAction(slug, values);
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors))
          setError(k as keyof FormShape, { message: m });
      }
      return;
    }
    toast({ variant: "success", title: isEdit ? "Deal updated" : "Deal created" });
    onDone();
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div role="alert" className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="title" required>
          Title
        </Label>
        <Input id="title" placeholder="e.g. 20% OFF today" invalid={!!errors.title} {...register("title")} />
        <FieldError message={errors.title?.message} />
      </FormField>
      <FormField>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          placeholder="e.g. Use it on any order over Rs 500"
          {...register("subtitle")}
        />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="type" required>
            Type
          </Label>
          <select
            id="type"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("type")}
          >
            <option value="PERCENT_OFF">Percent off</option>
            <option value="FLAT_OFF">Flat amount off</option>
            <option value="FREE_DELIVERY">Free delivery</option>
          </select>
        </FormField>
        {type === "PERCENT_OFF" ? (
          <FormField>
            <Label htmlFor="percentBps">Discount % (bps · 1000 = 10%)</Label>
            <Input
              id="percentBps"
              type="number"
              min={1}
              max={10000}
              invalid={!!errors.percentBps}
              {...register("percentBps", { valueAsNumber: true })}
            />
            <FieldHint>Enter 1000 for 10%, 2000 for 20%, etc.</FieldHint>
            <FieldError message={errors.percentBps?.message} />
          </FormField>
        ) : null}
        {type === "FLAT_OFF" ? (
          <FormField>
            <Label htmlFor="flatOffRupees">Flat off (PKR)</Label>
            <Input
              id="flatOffRupees"
              type="number"
              step="0.01"
              min={0}
              invalid={!!errors.flatOffRupees}
              {...register("flatOffRupees", { valueAsNumber: true })}
            />
            <FieldError message={errors.flatOffRupees?.message} />
          </FormField>
        ) : null}
      </div>

      <FormField>
        <Label htmlFor="minOrderRupees">Minimum order (PKR)</Label>
        <Input
          id="minOrderRupees"
          type="number"
          step="0.01"
          min={0}
          invalid={!!errors.minOrderRupees}
          {...register("minOrderRupees", { valueAsNumber: true })}
        />
        <FieldHint>Set 0 for no minimum.</FieldHint>
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="startsAt">Starts</Label>
          <Input id="startsAt" type="date" {...register("startsAt")} />
        </FormField>
        <FormField>
          <Label htmlFor="endsAt">Ends (optional)</Label>
          <Input id="endsAt" type="date" {...register("endsAt")} />
        </FormField>
      </div>

      <FormField>
        <Label htmlFor="heroImageUrl">Hero image URL (optional)</Label>
        <Input id="heroImageUrl" placeholder="https://…" {...register("heroImageUrl")} />
        <FieldHint>Direct image URL for the banner background.</FieldHint>
        <FieldError message={errors.heroImageUrl?.message} />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField>
          <Label htmlFor="bgColor">Custom background (hex)</Label>
          <Input id="bgColor" placeholder="#EA580C" {...register("bgColor")} />
          <FieldError message={errors.bgColor?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="ctaLabel">CTA label</Label>
          <Input id="ctaLabel" placeholder="Order now" {...register("ctaLabel")} />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          {...register("isActive")}
        />
        <span>Active — visible to customers</span>
      </label>

      <input type="hidden" {...register("sortOrder", { valueAsNumber: true })} />

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4 text-xs">
        <span className="flex items-center gap-1.5 text-foreground-muted">
          <ImageIcon className="h-3.5 w-3.5" />
          Customer sees this on /r/{slug}
        </span>
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Create deal"}
        </Button>
      </div>
    </form>
  );
}
