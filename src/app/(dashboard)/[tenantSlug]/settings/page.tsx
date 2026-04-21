import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Globe, MessageCircle, Store, Truck, Waypoints } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { getTenantContext } from "@/lib/tenant/context";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsHome({ params }: { params: { tenantSlug: string } }) {
  let ctx;
  try {
    ctx = await getTenantContext(params.tenantSlug);
  } catch {
    notFound();
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    include: { _count: { select: { branches: { where: { deletedAt: null } } } } },
  });
  if (!tenant) notFound();
  const areaCount = tenant.deliveryAreas.length;
  const activeChannels = [tenant.hasTakeaway && "Takeaway", tenant.hasDelivery && "Delivery"]
    .filter(Boolean)
    .join(" · ");
  const activePayments = [
    tenant.acceptCash && "Cash",
    tenant.acceptCard && "Card",
    tenant.acceptJazzCash && "JazzCash",
    tenant.acceptEasypaisa && "Easypaisa",
    tenant.acceptBankTransfer && "Bank",
  ].filter(Boolean).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SettingsTile
        href={`/${params.tenantSlug}/settings/profile`}
        icon={<Store className="h-4 w-4" />}
        title="Restaurant profile"
        desc={`${tenant.name} · ${tenant.cuisineType.toLowerCase().replace("_", " ")}`}
        body="Name, logo, brand color, cuisine, contact phone."
      />
      <SettingsTile
        href={`/${params.tenantSlug}/settings/channels`}
        icon={<Waypoints className="h-4 w-4" />}
        title="Channels & payments"
        desc={`${activeChannels || "No channels"} · ${activePayments} payment method${activePayments === 1 ? "" : "s"}`}
        body="Turn takeaway or delivery on/off and pick your payment methods."
      />
      <SettingsTile
        href={`/${params.tenantSlug}/settings/branches`}
        icon={<Building2 className="h-4 w-4" />}
        title="Branches"
        desc={`${tenant._count.branches} branch${tenant._count.branches === 1 ? "" : "es"}`}
        body="Add outlets, set tax / service rates, mark primary branch."
      />
      <SettingsTile
        href={`/${params.tenantSlug}/settings/delivery`}
        icon={<Truck className="h-4 w-4" />}
        title="Delivery zones"
        desc={areaCount > 0 ? `${areaCount} area${areaCount === 1 ? "" : "s"}` : "Delivering anywhere"}
        body="Allow-list of areas, delivery fee, minimum order."
      />
      <SettingsTile
        href={`/${params.tenantSlug}/settings/locale`}
        icon={<Globe className="h-4 w-4" />}
        title="Localization"
        desc={`${tenant.currency} · ${tenant.timezone} · ${tenant.locale}`}
        body="Currency, timezone, language."
      />
      <SettingsTile
        href={`/${params.tenantSlug}/settings/whatsapp`}
        icon={<MessageCircle className="h-4 w-4" />}
        title="WhatsApp"
        desc={tenant.whatsappEnabled ? "Inbox enabled" : "Disabled"}
        body="Connect WhatsApp for customer conversations."
      />
    </div>
  );
}

function SettingsTile({
  href,
  icon,
  title,
  desc,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  body: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-border-strong">
        <CardHeader>
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <p className="text-sm text-foreground-muted">{body}</p>
      </Card>
    </Link>
  );
}
