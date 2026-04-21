"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star, StarOff, MessageSquare, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";
import { useToast } from "@/components/ui/use-toast";
import { submitReviewAction } from "@/server/actions/review.actions";
import {
  reviewCreateSchema,
  type ReviewCreateInput,
} from "@/lib/validations/review.schema";

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  authorName: string | null;
};

export function ReviewsSection({
  slug,
  average,
  total,
  reviews,
}: {
  slug: string;
  average: number;
  total: number;
  reviews: PublicReview[];
}) {
  const { data: session } = useSession();
  const [writeOpen, setWriteOpen] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);

  function openWrite() {
    if (!session) {
      setLoginOpen(true);
      return;
    }
    setWriteOpen(true);
  }

  return (
    <section className="container">
      <div className="rounded-3xl border border-border bg-background p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-primary">
              Customer reviews
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-h2">
              <StarStrip value={average} />
              <span className="font-mono text-h2">{average.toFixed(1)}</span>
              <span className="text-sm text-foreground-muted">
                ({total} review{total === 1 ? "" : "s"})
              </span>
            </h2>
          </div>
          <Button size="sm" onClick={openWrite}>
            <PencilLine className="h-4 w-4" /> Write a review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
            <MessageSquare className="mx-auto h-5 w-5" />
            Be the first to share your experience.
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarStrip value={r.rating} />
                    <span className="text-sm font-medium">
                      {r.authorName ?? "Customer"}
                    </span>
                  </div>
                  <span className="text-[11px] text-foreground-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.title ? (
                  <p className="mt-2 text-sm font-semibold">{r.title}</p>
                ) : null}
                {r.body ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                    {r.body}
                  </p>
                ) : null}
                {r.ownerReply ? (
                  <div className="mt-3 rounded-xl border-l-4 border-primary bg-primary/5 p-3">
                    <p className="font-mono text-[11px] uppercase tracking-wide text-primary">
                      Owner's reply
                    </p>
                    <p className="mt-1 text-sm">{r.ownerReply}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your experience</DialogTitle>
            <DialogDescription>
              Ratings help other customers and help the kitchen improve.
            </DialogDescription>
          </DialogHeader>
          <ReviewForm slug={slug} onDone={() => setWriteOpen(false)} />
        </DialogContent>
      </Dialog>

      <LoginRequiredDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        callbackUrl={`/r/${slug}`}
        title="Login to write a review"
        description="Sign in so we can verify it's really you."
      />
    </section>
  );
}

function StarStrip({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= Math.round(value) ? (
          <Star key={n} className="h-4 w-4 fill-warning" />
        ) : (
          <StarOff key={n} className="h-4 w-4 opacity-30" />
        ),
      )}
    </span>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ReviewCreateInput>({
    resolver: zodResolver(reviewCreateSchema),
    mode: "onBlur",
    defaultValues: { rating: 5, title: "", body: "", orderId: null },
  });
  const rating = watch("rating");

  async function onSubmit(values: ReviewCreateInput) {
    setSubmitting(true);
    const res = await submitReviewAction(slug, values);
    setSubmitting(false);
    if (!res.ok) {
      toast({ variant: "danger", title: "Couldn't save", description: res.error });
      return;
    }
    toast({ variant: "success", title: "Thanks for the review!" });
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField>
        <Label required>Your rating</Label>
        <div className="mt-1 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setValue("rating", n, { shouldValidate: true })}
              className="rounded transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 ${
                  n <= rating ? "fill-warning text-warning" : "text-foreground-muted/40"
                }`}
              />
            </button>
          ))}
        </div>
        <FieldError message={errors.rating?.message} />
      </FormField>
      <FormField>
        <Label htmlFor="r-title">Title (optional)</Label>
        <Input id="r-title" placeholder="Best burger in town" {...register("title")} />
      </FormField>
      <FormField>
        <Label htmlFor="r-body">Your review (optional)</Label>
        <textarea
          id="r-body"
          rows={4}
          placeholder="Tell us what you liked or what could be better."
          className="flex w-full rounded-md border border-border bg-background p-3 text-sm"
          {...register("body")}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!isValid}>
          Post review
        </Button>
      </div>
    </form>
  );
}
