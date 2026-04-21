import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileTabBar } from "@/components/dashboard/mobile-nav";
import { WarmCanvas } from "@/components/ui/warm-canvas";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantSlug: string };
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/${params.tenantSlug}`);
  }

  const membership = session.user.memberships.find(
    (m) => m.tenantSlug === params.tenantSlug,
  );

  if (!membership) {
    // No membership in this tenant — super admin must use explicit impersonation.
    if (session.user.isSuperAdmin) {
      redirect(`/super-admin/tenants?notice=use-impersonation`);
    }
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar
        tenantSlug={membership.tenantSlug}
        tenantId={membership.tenantId}
        tenantName={membership.tenantName}
        userName={session.user.name}
        role={membership.role}
      />
      <div className="flex flex-1">
        <Sidebar slug={params.tenantSlug} />
        <WarmCanvas className="flex-1 pb-16 md:pb-0">
          <main>{children}</main>
        </WarmCanvas>
      </div>
      <MobileTabBar slug={params.tenantSlug} />
    </div>
  );
}
