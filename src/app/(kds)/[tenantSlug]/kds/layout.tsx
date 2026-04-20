import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function KDSLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantSlug: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect(`/login?callbackUrl=/${params.tenantSlug}/kds`);
  const m = session.user.memberships.find((x) => x.tenantSlug === params.tenantSlug);
  if (!m) notFound();
  return <div className="min-h-screen bg-foreground text-background dark:bg-background dark:text-foreground">{children}</div>;
}
