import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { GuestTrackForm } from "@/components/customer/guest-track-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your order" };

export default async function GuestTrackPage({
  params,
}: {
  params: { slug: string };
}) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { name: true },
  });
  if (!tenant) notFound();

  return (
    <div className="container max-w-md py-6">
      <Link
        href={`/r/${params.slug}`}
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to {tenant.name}
      </Link>

      <header className="mt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
          <Search className="h-3 w-3" />
          Order lookup
        </span>
        <h1 className="mt-2 text-h1">Track your order</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Enter the order number and the phone number you used at checkout.
        </p>
      </header>

      <div className="mt-5 rounded-2xl border border-border bg-background p-5 shadow-sm">
        <GuestTrackForm slug={params.slug} />
      </div>

      <p className="mt-4 text-center text-xs text-foreground-subtle">
        Already have an account?{" "}
        <Link
          href={`/r/${params.slug}/account`}
          className="font-medium text-primary hover:underline"
        >
          Sign in to see all orders
        </Link>
      </p>
    </div>
  );
}
