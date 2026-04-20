import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Phone, Star, Truck } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { APP } from "@/lib/config/app";

export default async function PublicTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      brandColor: true,
      contactPhone: true,
      hasDelivery: true,
    },
  });
  if (!tenant) notFound();

  const brand =
    tenant.brandColor && /^#[0-9a-f]{6}$/i.test(tenant.brandColor) ? tenant.brandColor : null;

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={brand ? ({ ["--brand-public"]: brand } as React.CSSProperties) : undefined}
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href={`/r/${params.slug}`} className="flex min-w-0 items-center gap-2.5">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-10 w-10 flex-shrink-0 rounded-xl object-cover shadow-sm ring-2 ring-background"
              />
            ) : (
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm"
                style={brand ? { backgroundColor: brand } : { backgroundColor: "hsl(var(--primary))" }}
              >
                <span className="font-mono text-base font-semibold">{tenant.name.charAt(0)}</span>
              </span>
            )}
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{tenant.name}</span>
                <span className="hidden items-center gap-0.5 rounded-full bg-success-subtle px-1.5 py-0.5 text-[10px] font-medium text-success sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
                  Open
                </span>
              </p>
              <p className="hidden items-center gap-2 text-[11px] text-foreground-muted sm:flex">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-warning text-warning" /> 4.8
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 15–25 min
                </span>
                {tenant.hasDelivery ? (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Delivery
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </Link>

          {tenant.contactPhone ? (
            <a
              href={`tel:${tenant.contactPhone}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tenant.contactPhone}</span>
              <span className="sm:hidden">Call</span>
            </a>
          ) : null}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface py-4 text-center text-xs text-foreground-muted">
        Powered by <span className="font-semibold text-foreground">{APP.name}</span>
      </footer>
    </div>
  );
}
