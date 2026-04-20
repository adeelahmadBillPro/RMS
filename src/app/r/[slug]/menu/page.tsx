import { notFound } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { EmptyState } from "@/components/ui/states/empty-state";
import { PublicMenuScreen } from "@/components/customer/public-menu-screen";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { channel?: string };
}) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { id: true, name: true, hasDelivery: true, hasTakeaway: true },
  });
  if (!tenant) notFound();

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId: tenant.id, deletedAt: null, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId: tenant.id, deletedAt: null, isAvailable: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        variants: {
          where: { deletedAt: null, isAvailable: true },
          orderBy: { sortOrder: "asc" },
        },
        modifierGroups: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            modifiers: {
              where: { deletedAt: null, isAvailable: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
  ]);

  if (categories.length === 0 || items.length === 0) {
    return (
      <div className="container py-12">
        <EmptyState
          icon={<UtensilsCrossed className="h-5 w-5" />}
          title="Menu coming soon"
          description="The kitchen is still setting up. Please try again shortly."
        />
      </div>
    );
  }

  const requestedChannel =
    searchParams.channel === "DELIVERY" ? "DELIVERY" :
    searchParams.channel === "TAKEAWAY" ? "TAKEAWAY" :
    tenant.hasTakeaway ? "TAKEAWAY" : tenant.hasDelivery ? "DELIVERY" : "TAKEAWAY";

  return (
    <PublicMenuScreen
      slug={params.slug}
      tenantName={tenant.name}
      hasDelivery={tenant.hasDelivery}
      hasTakeaway={tenant.hasTakeaway}
      defaultChannel={requestedChannel}
      mode="generic"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      items={items.map(serializeItem)}
    />
  );
}

function serializeItem(it: {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  categoryId: string;
  variants: { id: string; name: string; priceCents: number; isDefault: boolean }[];
  modifierGroups: {
    id: string;
    name: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    modifiers: { id: string; name: string; priceDeltaCents: number }[];
  }[];
}) {
  return {
    id: it.id,
    name: it.name,
    photoUrl: it.photoUrl,
    description: it.description,
    categoryId: it.categoryId,
    variants: it.variants,
    modifierGroups: it.modifierGroups,
  };
}
