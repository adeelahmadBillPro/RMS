"use client";

import * as React from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { deleteBranchAction } from "@/server/actions/branch.actions";
import { BranchForm, type BranchFormValues } from "./branch-form";
import { formatBps } from "@/lib/tenant/branch";

interface Props {
  slug: string;
  branches: BranchFormValues[];
  canManage: boolean;
  canDelete: boolean;
}

export function BranchManager({ slug, branches, canManage, canDelete }: Props) {
  const [editing, setEditing] = React.useState<BranchFormValues | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const { toast } = useToast();

  async function onDelete(id: string) {
    if (!confirm("Delete this branch? This cannot be undone.")) return;
    setDeleting(id);
    const res = await deleteBranchAction(slug, { id });
    setDeleting(null);
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t delete", description: res.error });
    else toast({ variant: "success", title: "Branch deleted" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {branches.length} branch{branches.length === 1 ? "" : "es"}
        </p>
        {canManage ? (
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        ) : null}
      </div>

      {branches.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Address</th>
                <th className="px-4 py-2 text-left font-medium">Phone</th>
                <th className="px-4 py-2 text-left font-medium">Tax</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {b.isPrimary ? (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      ) : null}
                      {b.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{b.address ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-muted">
                    {b.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{formatBps(b.taxBps)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={b.isActive ? "success" : "neutral"}>
                      {b.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canManage ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit branch"
                          onClick={() => setEditing(b)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete branch"
                          loading={deleting === b.id}
                          onClick={() => onDelete(b.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add branch</DialogTitle>
            <DialogDescription>This branch becomes primary if it’s your first.</DialogDescription>
          </DialogHeader>
          <BranchForm slug={slug} onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit branch</DialogTitle>
          </DialogHeader>
          {editing ? (
            <BranchForm slug={slug} initial={editing} onDone={() => setEditing(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
