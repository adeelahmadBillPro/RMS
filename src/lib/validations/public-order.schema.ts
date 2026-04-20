import { z } from "zod";
import { phonePkSchema } from "./common.schema";

export const publicOrderItemSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20, "Up to 20 of one item"),
  notes: z.string().trim().max(120).optional().or(z.literal("")),
  modifierIds: z.array(z.string().cuid()).max(20),
});

export const publicOrderSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(40)
      .regex(/^[a-z0-9-]+$/, "Bad URL"),
    // For QR table flow, we forward the table's qrCode (not its DB id) so the
    // public client never needs to know internal IDs.
    tableQr: z.string().min(8).max(40).optional().or(z.literal("")),
    channel: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE"]),
    customerPhone: phonePkSchema,
    customerName: z
      .string()
      .trim()
      .min(2, "Name must be 2–60 characters")
      .max(60, "Name must be 2–60 characters"),
    deliveryAddress: z.string().trim().max(300).optional().or(z.literal("")),
    items: z.array(publicOrderItemSchema).min(1, "Cart is empty").max(40, "Up to 40 lines"),
    notes: z.string().trim().max(200).optional().or(z.literal("")),
    idempotencyKey: z.string().min(8).max(64),
  })
  .refine(
    (d) => d.channel !== "DINE_IN" || (!!d.tableQr && d.tableQr.length > 0),
    { path: ["tableQr"], message: "Dine-in requires a table" },
  )
  .refine(
    (d) => d.channel !== "DELIVERY" || (!!d.deliveryAddress && d.deliveryAddress.length > 0),
    { path: ["deliveryAddress"], message: "Delivery requires an address" },
  );

export type PublicOrderInput = z.infer<typeof publicOrderSchema>;
