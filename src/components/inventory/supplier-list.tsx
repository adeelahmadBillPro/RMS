"use client";

import { Pencil, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states/empty-state";
import type { SupplierRow } from "./types";

interface Props {
  slug: string;
  canManage: boolean;
  suppliers: SupplierRow[];
  onEdit: (s: SupplierRow) => void;
  onCreateFirst: () => void;
}

export function SupplierList({ canManage, suppliers, onEdit, onCreateFirst }: Props) {
  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-5 w-5" />}
        title="No suppliers yet"
        description="Track who you buy from. Optional but useful for purchase logs."
        action={canManage ? <Button onClick={onCreateFirst}>Add first supplier</Button> : null}
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted text-xs uppercase tracking-wide text-foreground-muted">
            <th className="px-4 py-2 text-left font-medium">Name</th>
            <th className="px-4 py-2 text-left font-medium">Contact</th>
            <th className="px-4 py-2 text-left font-medium">Phone</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-t border-border hover:bg-surface-muted">
              <td className="px-4 py-3 font-medium">{s.name}</td>
              <td className="px-4 py-3 text-foreground-muted">{s.contactName ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-foreground-muted">{s.phone ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {canManage ? (
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
