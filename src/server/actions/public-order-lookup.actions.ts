"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  slug: z.string().min(1),
  orderNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Order number must be digits")
    .transform((s) => parseInt(s, 10)),
  phone: z
    .string()
    .trim()
    .min(4, "Enter the phone number you used at checkout"),
});

export type LookupResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * Guest order lookup by tenant slug + order # + phone last digits.
 * Matches when the stored customerPhone *contains* the entered digits, so
 * a customer can paste either "03001234567" or just "1234567" and still find
 * their order.
 */
export async function lookupGuestOrder(input: {
  slug: string;
  orderNumber: string;
  phone: string;
}): Promise<LookupResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { slug, orderNumber, phone } = parsed.data;
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 4) {
    return { ok: false, error: "Enter at least 4 digits of your phone number" };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return { ok: false, error: "Restaurant not found" };

  const order = await prisma.order.findFirst({
    where: {
      tenantId: tenant.id,
      orderNumber,
      customerPhone: { contains: phoneDigits },
    },
    select: { id: true },
  });
  if (!order) {
    return {
      ok: false,
      error: "We couldn’t find that order. Check the order # and phone number.",
    };
  }
  return { ok: true, orderId: order.id };
}
