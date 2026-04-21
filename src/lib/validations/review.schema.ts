import { z } from "zod";

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1, "Pick 1–5 stars").max(5),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  orderId: z.string().cuid().optional().nullable(),
});
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const reviewReplySchema = z.object({
  id: z.string().cuid(),
  reply: z.string().trim().min(2, "Reply must be 2+ chars").max(500),
});

export const reviewHideSchema = z.object({
  id: z.string().cuid(),
  hidden: z.boolean(),
});
