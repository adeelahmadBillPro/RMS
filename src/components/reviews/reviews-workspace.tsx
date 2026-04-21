"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MessageCircleReply, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/states/empty-state";
import { useToast } from "@/components/ui/use-toast";
import {
  replyToReviewAction,
  setReviewHiddenAction,
} from "@/server/actions/review.actions";

export type AdminReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isHidden: boolean;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

export function ReviewsWorkspace({
  slug,
  canModerate,
  reviews,
}: {
  slug: string;
  canModerate: boolean;
  reviews: AdminReview[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [replying, setReplying] = React.useState<AdminReview | null>(null);

  async function toggleHide(r: AdminReview) {
    const res = await setReviewHiddenAction(slug, { id: r.id, hidden: !r.isHidden });
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't update", description: res.error });
      return;
    }
    toast({
      variant: "success",
      title: r.isHidden ? "Review restored" : "Review hidden",
    });
    router.refresh();
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-5 w-5" />}
        title="No reviews yet"
        description="Once customers start leaving feedback, you'll see it here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <article
          key={r.id}
          className={`rounded-2xl border p-4 ${
            r.isHidden ? "border-dashed border-warning bg-warning-subtle/30" : "border-border bg-background"
          }`}
        >
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-foreground-muted/30"}`}
                  />
                ))}
              </span>
              <p className="text-sm font-medium">{r.author.name}</p>
              <p className="text-[11px] text-foreground-muted">{r.author.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-foreground-muted">
                {new Date(r.createdAt).toLocaleString()}
              </span>
              {r.isHidden ? <Badge variant="warning">Hidden</Badge> : null}
            </div>
          </header>
          {r.title ? <p className="mt-2 text-sm font-semibold">{r.title}</p> : null}
          {r.body ? <p className="mt-1 whitespace-pre-wrap text-sm">{r.body}</p> : null}
          {r.ownerReply ? (
            <div className="mt-3 rounded-xl border-l-4 border-primary bg-primary/5 p-3 text-sm">
              <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
                Your reply
              </p>
              <p className="mt-1">{r.ownerReply}</p>
            </div>
          ) : null}
          {canModerate ? (
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleHide(r)}>
                {r.isHidden ? (
                  <>
                    <Eye className="h-4 w-4" /> Show again
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" /> Hide
                  </>
                )}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setReplying(r)}>
                <MessageCircleReply className="h-4 w-4" />
                {r.ownerReply ? "Edit reply" : "Reply"}
              </Button>
            </div>
          ) : null}
        </article>
      ))}

      <Dialog open={!!replying} onOpenChange={(o) => !o && setReplying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Public reply</DialogTitle>
          </DialogHeader>
          {replying ? (
            <ReplyForm
              slug={slug}
              review={replying}
              onDone={() => {
                setReplying(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReplyForm({
  slug,
  review,
  onDone,
}: {
  slug: string;
  review: AdminReview;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reply, setReply] = React.useState(review.ownerReply ?? "");
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await replyToReviewAction(slug, { id: review.id, reply });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Reply posted" });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-3 text-sm">
        <p className="text-[11px] uppercase text-foreground-muted">Customer wrote</p>
        {review.title ? <p className="mt-1 font-semibold">{review.title}</p> : null}
        {review.body ? <p className="mt-1 whitespace-pre-wrap">{review.body}</p> : null}
      </div>
      <div>
        <Label htmlFor="reply">Your reply</Label>
        <textarea
          id="reply"
          rows={4}
          className="mt-1 flex w-full rounded-md border border-border bg-background p-3 text-sm"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={reply.trim().length < 2}>
          Post reply
        </Button>
      </div>
    </form>
  );
}
