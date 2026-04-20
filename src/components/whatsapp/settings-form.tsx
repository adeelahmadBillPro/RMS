"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FieldHint, FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/use-toast";
import { toggleWhatsAppAction } from "@/server/actions/whatsapp.actions";

export function WhatsAppSettingsForm({
  slug,
  initial,
  canEdit,
}: {
  slug: string;
  initial: { enabled: boolean; whatsappNumber: string };
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [number, setNumber] = React.useState(initial.whatsappNumber);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setSubmitting(true);
    setError(null);
    const res = await toggleWhatsAppAction(slug, {
      enabled,
      whatsappNumber: number.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast({
      variant: "success",
      title: enabled ? "WhatsApp enabled" : "WhatsApp disabled",
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-danger bg-danger-subtle p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!canEdit}
        />
        <span className="flex-1">
          <span className="block text-sm font-medium">
            Receive WhatsApp messages in this panel
          </span>
          <span className="mt-0.5 block text-xs text-foreground-muted">
            When OFF: the webhook drops inbound messages, sending is refused, and the
            inbox is hidden. You can turn this back on any time.
          </span>
        </span>
      </label>

      <FormField>
        <Label htmlFor="wa-number">WhatsApp business number (display only)</Label>
        <Input
          id="wa-number"
          placeholder="03001234567"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          disabled={!canEdit}
        />
        <FieldHint>
          Shown in the inbox header so your staff know which number customers see.
        </FieldHint>
        {error ? <FieldError message={error} /> : null}
      </FormField>

      {canEdit ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            onClick={save}
            loading={submitting}
            disabled={enabled === initial.enabled && number === initial.whatsappNumber}
          >
            Save changes
          </Button>
        </div>
      ) : (
        <p className="text-xs text-foreground-muted">
          Only owners can change the integration toggle.
        </p>
      )}
    </div>
  );
}
