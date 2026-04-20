import { notFound } from "next/navigation";
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
    select: { id: true, name: true, logoUrl: true, brandColor: true, contactPhone: true },
  });
  if (!tenant) notFound();

  const brand = tenant.brandColor && /^#[0-9a-f]{6}$/i.test(tenant.brandColor) ? tenant.brandColor : null;

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      style={brand ? ({ ["--brand-public"]: brand } as React.CSSProperties) : undefined}
    >
      <header className="border-b border-border bg-surface">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground"
                style={brand ? { backgroundColor: brand } : { backgroundColor: "hsl(var(--primary))" }}
              >
                <span className="font-mono text-sm">{tenant.name.charAt(0)}</span>
              </span>
            )}
            <span>{tenant.name}</span>
          </div>
          {tenant.contactPhone ? (
            <a
              href={`tel:${tenant.contactPhone}`}
              className="font-mono text-xs text-foreground-muted hover:text-foreground"
            >
              {tenant.contactPhone}
            </a>
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-surface py-4 text-center text-xs text-foreground-muted">
        Powered by {APP.name}
      </footer>
    </div>
  );
}
