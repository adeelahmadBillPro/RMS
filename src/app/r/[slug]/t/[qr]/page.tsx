import { notFound } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { EmptyState } from "@/components/ui/states/empty-state";
import { PublicMenuScreen } from "@/components/customer/public-menu-screen";

export const dynamic = "force-dynamic";

export default async function QRTableMenu({
  params,
}: {
  params: { slug: string; qr: string };
}) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: params.slug, deletedAt: null },
    select: { id: true, name: true, hasDelivery: true, hasTakeaway: true },
  });
  if (!tenant) notFound();

  const table = await prisma.restaurantTable.findFirst({
    where: { qrCode: params.qr, tenantId: tenant.id, deletedAt: null },
    select: { id: true, label: true, qrCode: true, branchId: true },
  });
  if (!table) notFound();

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
          description="Ask your server to take your order while we get this back up."
        />
      </div>
    );
  }

  return (
    <PublicMenuScreen
      slug={params.slug}
      tenantName={tenant.name}
      hasDelivery={tenant.hasDelivery}
      hasTakeaway={tenant.hasTakeaway}
      defaultChannel="DINE_IN"
      mode="table"
      tableLabel={table.label}
      tableQr={table.qrCode}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      items={items.map((it) => ({
        id: it.id,
        name: it.name,
        photoUrl: it.photoUrl,
        description: it.description,
        categoryId: it.categoryId,
        variants: it.variants,
        modifierGroups: it.modifierGroups,
      }))}
    />
  );
}
