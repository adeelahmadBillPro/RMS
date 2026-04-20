"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  MessagesSquare,
  Plus,
  Send,
  ShoppingBag,
  UserCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/states/empty-state";
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
  closeThreadAction,
  markThreadReadAction,
  seedInboundMessageAction,
  sendWhatsAppMessageAction,
} from "@/server/actions/whatsapp.actions";
import { cn } from "@/lib/utils";
import type { WhatsAppMessageDirection, WhatsAppMessageStatus, WhatsAppThreadStatus } from "@prisma/client";

export type InboxThread = {
  id: string;
  customerPhone: string;
  customerName: string | null;
  unreadCount: number;
  status: WhatsAppThreadStatus;
  lastMessageAt: string;
  convertedOrderId: string | null;
  messages: {
    id: string;
    direction: WhatsAppMessageDirection;
    body: string;
    createdAt: string;
    status: WhatsAppMessageStatus;
  }[];
};

export function WhatsAppInbox({
  slug,
  canManage,
  mockMode,
  threads,
}: {
  slug: string;
  canManage: boolean;
  mockMode: boolean;
  threads: InboxThread[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = React.useState<string | null>(threads[0]?.id ?? null);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

  // Poll every 6s for new inbound messages
  React.useEffect(() => {
    const id = setInterval(() => router.refresh(), 6_000);
    return () => clearInterval(id);
  }, [router]);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  React.useEffect(() => {
    // Mark thread as read whenever a user opens one with unread messages
    if (selected && selected.unreadCount > 0) {
      void markThreadReadAction(slug, { threadId: selected.id });
    }
  }, [selected?.id, selected?.unreadCount, slug, selected]);

  async function send() {
    if (!selected || !draft.trim()) return;
    setSending(true);
    const res = await sendWhatsAppMessageAction(slug, {
      threadId: selected.id,
      body: draft.trim(),
    });
    setSending(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t send", description: res.error });
      return;
    }
    setDraft("");
    router.refresh();
  }

  async function closeThread(id: string) {
    if (!confirm("Close this conversation?")) return;
    const res = await closeThreadAction(slug, { threadId: id });
    if (!res.ok) toast({ variant: "danger", title: "Couldn’t close", description: res.error });
    else router.refresh();
  }

  async function seedDemoMessage(customerPhone: string, customerName: string, body: string) {
    setSeeding(true);
    const res = await seedInboundMessageAction(slug, { customerPhone, customerName, body });
    setSeeding(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn’t seed", description: res.error });
      return;
    }
    setSelectedId(res.data.threadId);
    toast({ variant: "success", title: "Inbound message seeded" });
    router.refresh();
  }

  if (threads.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<MessagesSquare className="h-5 w-5" />}
          title="No conversations yet"
          description={
            mockMode
              ? "You’re on the mock provider. Seed a demo inbound message to try the flow."
              : "When customers message your WhatsApp number, their messages will appear here."
          }
          action={
            mockMode && canManage ? (
              <SeedDemoButton onSeed={seedDemoMessage} busy={seeding} />
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-[320px_1fr]">
      {/* Thread list */}
      <aside className="h-[65vh] overflow-y-auto rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border p-2 text-xs text-foreground-muted">
          <span>{threads.length} conversation{threads.length === 1 ? "" : "s"}</span>
          {mockMode && canManage ? (
            <SeedDemoButton onSeed={seedDemoMessage} busy={seeding} small />
          ) : null}
        </div>
        <ul className="divide-y divide-border">
          {threads.map((t) => {
            const last = t.messages[t.messages.length - 1];
            const isActive = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "flex w-full items-start gap-2 p-3 text-left transition-colors",
                    isActive ? "bg-primary-subtle" : "hover:bg-surface-muted",
                  )}
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground-subtle">
                    <UserCircle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {t.customerName ?? t.customerPhone}
                      </p>
                      <span className="font-mono text-[10px] text-foreground-subtle">
                        {formatAgo(t.lastMessageAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-foreground-muted">
                      {last ? (last.direction === "OUTBOUND" ? "You: " : "") + last.body : ""}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {t.status === "CLOSED" ? (
                        <Badge variant="neutral">Closed</Badge>
                      ) : null}
                      {t.convertedOrderId ? (
                        <Badge variant="success">Order</Badge>
                      ) : null}
                      {t.unreadCount > 0 ? (
                        <Badge variant="primary" pulse>
                          {t.unreadCount} new
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Thread viewer */}
      <section className="flex h-[65vh] flex-col overflow-hidden rounded-xl border border-border bg-surface">
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {selected.customerName ?? selected.customerPhone}
                </p>
                <p className="font-mono text-xs text-foreground-muted">
                  {selected.customerPhone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      href={`/${slug}/pos?channel=DELIVERY&phone=${encodeURIComponent(selected.customerPhone)}&name=${encodeURIComponent(selected.customerName ?? "")}&fromThread=${selected.id}`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Create order
                    </Link>
                  </Button>
                ) : null}
                {canManage && selected.status !== "CLOSED" ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Close conversation"
                    onClick={() => closeThread(selected.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto bg-surface-muted/30 p-4">
              {selected.messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
              {selected.messages.length === 0 ? (
                <p className="py-8 text-center text-xs text-foreground-muted">
                  No messages yet.
                </p>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  selected.status === "CLOSED"
                    ? "Conversation closed — reopen by sending a message"
                    : "Type a reply…"
                }
                disabled={!canManage}
              />
              <Button type="submit" loading={sending} disabled={!draft.trim() || !canManage}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Pick a conversation"
            description="Select a conversation on the left to view messages."
          />
        )}
      </section>
    </div>
  );
}

function MessageBubble({
  m,
}: {
  m: InboxThread["messages"][number];
}) {
  const isOut = m.direction === "OUTBOUND";
  return (
    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOut
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-background",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            isOut ? "text-primary-foreground/80" : "text-foreground-muted",
          )}
        >
          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {isOut ? (
            m.status === "READ" ? (
              <CheckCheck className="h-3 w-3 text-info" />
            ) : m.status === "DELIVERED" ? (
              <CheckCheck className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            )
          ) : null}
        </p>
      </div>
    </div>
  );
}

function SeedDemoButton({
  onSeed,
  busy,
  small = false,
}: {
  onSeed: (phone: string, name: string, body: string) => void;
  busy: boolean;
  small?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState("03004567890");
  const [name, setName] = React.useState("Sara Demo");
  const [body, setBody] = React.useState(
    "Assalam-u-alaikum! Can I order a Zinger burger meal? Please deliver to House 5, Street 3, Gulshan.",
  );

  return (
    <>
      <Button
        size={small ? "sm" : "md"}
        variant={small ? "ghost" : "primary"}
        onClick={() => setOpen(true)}
        loading={busy}
      >
        <Plus className="h-3.5 w-3.5" /> {small ? "Demo msg" : "Seed a demo message"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seed a demo inbound message</DialogTitle>
            <DialogDescription>
              Available only on the mock provider. This simulates a customer sending
              you a WhatsApp message so you can try the flow end to end.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="seed-phone">From (phone)</Label>
              <Input id="seed-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="seed-name">Name (optional)</Label>
              <Input id="seed-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="seed-body">Message</Label>
              <Input id="seed-body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSeed(phone, name, body);
                setOpen(false);
              }}
              loading={busy}
            >
              Seed it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
