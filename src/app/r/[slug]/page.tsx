import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Button } from "@/components/ui/button";

export default async function PublicLanding({ params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { name: true, hasDelivery: true, hasTakeaway: true },
  });
  if (!tenant) notFound();

  return (
    <section className="container py-12">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-h1">Order from {tenant.name}</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Pick a way to get your food. We’ll send your order straight to the kitchen.
        </p>
        <div className="mt-8 grid gap-3">
          {tenant.hasTakeaway ? (
            <Button asChild size="lg">
              <Link href={`/r/${params.slug}/menu?channel=TAKEAWAY`}>
                <ShoppingBag className="h-4 w-4" /> Takeaway <ArrowRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {tenant.hasDelivery ? (
            <Button asChild size="lg" variant="secondary">
              <Link href={`/r/${params.slug}/menu?channel=DELIVERY`}>
                <Truck className="h-4 w-4" /> Delivery <ArrowRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {!tenant.hasDelivery && !tenant.hasTakeaway ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-muted">
              This restaurant only takes dine-in orders. Please scan the QR code on your table.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
