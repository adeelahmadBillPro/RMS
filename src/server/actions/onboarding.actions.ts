"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit/log";
import { onboardingFullSchema } from "@/lib/validations/onboarding.schema";
import { TRIAL_DAYS } from "@/lib/constants/plans";
import type { ActionResult } from "./auth.actions";

const cuisineMap = {
  restaurant: "RESTAURANT",
  cafe: "CAFE",
  fast_food: "FAST_FOOD",
  bakery: "BAKERY",
  cloud_kitchen: "CLOUD_KITCHEN",
  other: "OTHER",
} as const;

export async function completeOnboardingAction(
  input: unknown,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession();

  // If user already has a tenant, send them home — onboarding is one-shot.
  if (session.user.memberships.length > 0) {
    return {
      ok: false,
      error: "You already have a workspace.",
    };
  }

  const parsed = onboardingFullSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: "Some onboarding fields need attention.",
      fieldErrors,
    };
  }

  const data = parsed.data;

  // Slug uniqueness check (also enforced at DB)
  const taken = await prisma.tenant.findUnique({ where: { slug: data.slug } });
  if (taken) {
    return {
      ok: false,
      error: "That URL is already taken.",
      fieldErrors: { slug: "Please choose a different URL" },
    };
  }

  const trialPlan = await prisma.plan.findUnique({ where: { code: "trial" } });
  if (!trialPlan) {
    return {
      ok: false,
      error: "Plans haven't been initialized yet. Run `pnpm seed` and try again.",
    };
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  try {
    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          slug: data.slug,
          name: data.restaurantName,
          cuisineType: cuisineMap[data.cuisineType],
          contactPhone: data.contactPhone,
          logoUrl: data.logoUrl || null,
          brandColor: data.brandColor || null,
          hasDelivery: data.hasDelivery,
          hasTakeaway: data.hasTakeaway,
          acceptCash: data.acceptCash,
          acceptCard: data.acceptCard,
          acceptJazzCash: data.acceptJazzCash,
          acceptEasypaisa: data.acceptEasypaisa,
          acceptBankTransfer: data.acceptBankTransfer,
          onboardedAt: new Date(),
        },
      });

      await tx.tenantMembership.create({
        data: {
          tenantId: t.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: t.id,
          planId: trialPlan.id,
          status: "TRIALING",
          trialEndsAt: trialEnd,
          currentPeriodEnd: trialEnd,
        },
      });

      if (data.categories.length > 0) {
        await tx.menuCategorySeed.createMany({
          data: data.categories.map((name, idx) => ({
            tenantId: t.id,
            name,
            sortOrder: idx,
          })),
        });
      }

      // Create the default (primary) branch so order/inventory modules
      // always have something to attach to.
      await tx.branch.create({
        data: {
          tenantId: t.id,
          name: "Main branch",
          phone: data.contactPhone,
          isPrimary: true,
          isActive: true,
        },
      });

      return t;
    });

    await audit({
      action: "TENANT_CREATED",
      tenantId: tenant.id,
      userId: session.user.id,
      metadata: { slug: tenant.slug, name: tenant.name },
    });
    await audit({
      action: "ONBOARDING_COMPLETED",
      tenantId: tenant.id,
      userId: session.user.id,
    });

    revalidatePath("/");
    return { ok: true, data: { slug: tenant.slug } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "That URL is already taken.",
        fieldErrors: { slug: "Please choose a different URL" },
      };
    }
    throw err;
  }
}
