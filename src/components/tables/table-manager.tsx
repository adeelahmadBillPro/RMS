"use client";

import * as React from "react";
import { Pencil, Plus, QrCode, Table2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, FormField } from "@/components/ui/form-field";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  createTableAction,
  deleteTableAction,
  setTableStatusAction,
  updateTableAction,
} from "@/server/actions/table.actions";
import {
  tableCreateSchema,
  tableUpdateSchema,
  type TableCreateInput,
} from "@/lib/validations/order.schema";
import type { TableStatus } from "@prisma/client";

type TableRow = {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  branchId: string;
  qrCode: string;
  activeOrders: number;
};

type BranchPick = { id: string; name: string; isPrimary: boolean };

const STATUS_VARIANT: Record<TableStatus, "success" | "info" | "warning" | "neutral"> = {
  FREE: "success",
  OCCUPIED: "info",
  RESERVED: "warning",
  BILLING: "warning",
};

export function TableManager({
  slug,
  canManage,
  canDelete,
  branches,
  tables,
}: {
  slug: string;
  canManage: boolean;
  canDelete: boolean;
  branches: BranchPick[];
  tables: TableRow[];
}) {
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<TableRow | null>(null);
  const [qrPreview, setQrPreview] = React.useState<TableRow | null>(null);

  function publicTableUrl(t: TableRow) {
    if (typeof window === "undefined") return `/r/${slug}/t/${t.qrCode}`;
    return `${window.location.origin}/r/${slug}/t/${t.qrCode}`;
  }

  if (tables.length === 0 && !creating) {
    return (
      <>
        <EmptyState
          icon={<Table2 className="h-5 w-5" />}
          title="No tables yet"
          description="Add your dining tables so QR ordering and dine-in POS can attach to them."
          action={canManage ? <Button onClick={() => setCreating(true)}>Add first table</Button> : null}
        />
        <CreateDialog open={creating} onOpenChange={setCreating} slug={slug} branches={branches} />
      </>
    );
  }

  async function handleStatus(t: TableRow, status: TableStatus) {
    const res = await setTableStatusAction(slug, { id: t.id, status });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t update", description: res.error });
  }
  async function handleDelete(t: TableRow) {
    if (!confirm(`Delete table ${t.label}?`)) return;
    const res = await deleteTableAction(slug, { id: t.id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
    else toast({ variant: "success", title: "Deleted" });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {tables.length} table{tables.length === 1 ? "" : "s"}
        </p>
        {canManage ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add table
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((t) => (
          <div key={t.id} className="flex flex-col rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-h3">{t.label}</p>
                <p className="text-xs text-foreground-muted">
                  {t.seats} seats · {branches.find((b) => b.id === t.branchId)?.name ?? "—"}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
            </div>
            {t.activeOrders > 0 ? (
              <p className="mt-2 text-xs text-foreground-muted">{t.activeOrders} active order(s)</p>
            ) : null}
            {canManage ? (
              <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-2 text-xs">
                {(["FREE", "OCCUPIED", "RESERVED", "BILLING"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatus(t, s)}
                    disabled={t.status === s}
                    className={`rounded-full px-2 py-0.5 transition-colors ${
                      t.status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-muted text-foreground-muted hover:bg-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setQrPreview(t)} aria-label="Show QR code">
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(t)} aria-label="Edit table">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {canDelete ? (
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t)} aria-label="Delete table">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <CreateDialog open={creating} onOpenChange={setCreating} slug={slug} branches={branches} />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit table</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TableForm
              slug={slug}
              branches={branches}
              initial={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrPreview} onOpenChange={(o) => !o && setQrPreview(null)}>
        <DialogContent>
          {qrPreview ? (
            <>
              <DialogHeader>
                <DialogTitle>QR code · {qrPreview.label}</DialogTitle>
                <DialogDescription>
                  Customers scan this to land on the menu pre-attached to this table.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr?content=${encodeURIComponent(publicTableUrl(qrPreview))}&size=320`}
                  alt={`QR code for ${qrPreview.label}`}
                  className="rounded-lg border border-border"
                  width={320}
                  height={320}
                />
                <a
                  href={publicTableUrl(qrPreview)}
                  target="_blank"
                  rel="noopener"
                  className="break-all text-center font-mono text-xs text-primary hover:underline"
                >
                  {publicTableUrl(qrPreview)}
                </a>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <a href={publicTableUrl(qrPreview)} target="_blank" rel="noopener">
                      Open in new tab
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const win = window.open("", "_blank");
                      if (!win) return;
                      win.document.write(`<!DOCTYPE html><html><head><title>QR ${qrPreview.label}</title>
<style>body{display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:40px}h1{margin:0 0 8px}p{font-family:monospace;font-size:11px;color:#666;word-break:break-all;text-align:center;margin-top:8px}</style>
</head><body><h1>${qrPreview.label}</h1><img src="/api/qr?content=${encodeURIComponent(publicTableUrl(qrPreview))}&size=512" width="320" /><p>${publicTableUrl(qrPreview)}</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
                      win.document.close();
                    }}
                  >
                    Print
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  slug,
  branches,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slug: string;
  branches: BranchPick[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add table</DialogTitle>
        </DialogHeader>
        <TableForm slug={slug} branches={branches} initial={null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TableForm({
  slug,
  branches,
  initial,
  onDone,
}: {
  slug: string;
  branches: BranchPick[];
  initial: TableRow | null;
  onDone: () => void;
}) {
  const isEdit = !!initial;
  const { toast } = useToast();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  type FormShape = TableCreateInput & { id?: string };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<FormShape>({
    resolver: zodResolver(isEdit ? tableUpdateSchema : tableCreateSchema),
    mode: "onBlur",
    defaultValues: {
      id: initial?.id,
      branchId: initial?.branchId ?? branches.find((b) => b.isPrimary)?.id ?? branches[0]?.id ?? "",
      label: initial?.label ?? "",
      seats: initial?.seats ?? 2,
    },
  });

  async function onSubmit(values: FormShape) {
    setSubmitting(true);
    setServerError(null);
    const res = isEdit
      ? await updateTableAction(slug, values)
      : await createTableAction(slug, values);
    if (!res.ok) {
      setServerError(res.error);
      if (res.fieldErrors) {
        for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof FormShape, { message: m });
      }
      setSubmitting(false);
      return;
    }
    toast({ variant: "success", title: isEdit ? "Table updated" : "Table created" });
    onDone();
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div role="alert" className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger">
          {serverError}
        </div>
      ) : null}

      <FormField>
        <Label htmlFor="label" required>Label</Label>
        <Input id="label" placeholder="T-1" invalid={!!errors.label} {...register("label")} />
        <FieldError message={errors.label?.message} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField>
          <Label htmlFor="seats" required>Seats</Label>
          <Input
            id="seats"
            type="number"
            min={1}
            max={50}
            invalid={!!errors.seats}
            {...register("seats", { valueAsNumber: true })}
          />
          <FieldError message={errors.seats?.message} />
        </FormField>
        <FormField>
          <Label htmlFor="branchId" required>Branch</Label>
          <select
            id="branchId"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            {...register("branchId")}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.isPrimary ? " · primary" : ""}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={submitting} disabled={!isValid}>
          {isEdit ? "Save changes" : "Create table"}
        </Button>
      </div>
    </form>
  );
}
