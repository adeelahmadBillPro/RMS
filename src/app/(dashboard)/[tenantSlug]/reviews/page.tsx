import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { ReviewsWorkspace } from "@/components/reviews/reviews-workspace";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }

  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.review.aggregate({
      where: { tenantId: ctx.tenantId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const authorIds = Array.from(new Set(reviews.map((r) => r.userId)));
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const canModerate = ctx.membership.role === "OWNER" || ctx.membership.role === "MANAGER";

  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">REVIEWS & RATINGS</p>
        <h1 className="mt-1 flex items-center gap-2 text-h1">
          <Star className="h-6 w-6 fill-warning text-warning" />
          Customer reviews
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {(agg._avg.rating ?? 0).toFixed(1)} average · {agg._count._all} public review
          {agg._count._all === 1 ? "" : "s"}. Hide spam, reply publicly to earn trust.
        </p>
      </header>
      <ReviewsWorkspace
        slug={params.tenantSlug}
        canModerate={canModerate}
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          isHidden: r.isHidden,
          ownerReply: r.ownerReply,
          ownerRepliedAt: r.ownerRepliedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          author: authorMap.get(r.userId) ?? { id: r.userId, name: "Customer", email: "" },
        }))}
      />
    </div>
  );
}
