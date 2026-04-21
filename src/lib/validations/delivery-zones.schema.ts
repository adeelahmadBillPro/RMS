import { z } from "zod";

export const deliveryZonesSchema = z.object({
  deliveryAreas: z
    .array(z.string().trim().min(1).max(60))
    .max(40, "Up to 40 areas")
    .default([]),
  deliveryFeeRupees: z.number().min(0).max(10_000).default(0),
  deliveryMinOrderRupees: z.number().min(0).max(10_000_000).default(0),
  deliveryRadiusKm: z.number().min(0).max(200).optional().nullable(),
});

export type DeliveryZonesInput = z.infer<typeof deliveryZonesSchema>;

/**
 * Given a free-text delivery address, decide whether it's covered by the
 * tenant's allow-list of area keywords. Empty list = covered anywhere.
 */
export function addressCoveredByAreas(address: string, areas: string[]): boolean {
  if (!areas.length) return true;
  const a = address.toLowerCase();
  return areas.some((area) => a.includes(area.toLowerCase()));
}
