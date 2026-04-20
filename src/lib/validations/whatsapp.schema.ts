import { z } from "zod";
import { phonePkSchema } from "./common.schema";

export const sendMessageSchema = z.object({
  threadId: z.string().cuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message can't be empty")
    .max(2000, "Keep it under 2000 characters"),
});

export const closeThreadSchema = z.object({ threadId: z.string().cuid() });
export const markReadSchema = z.object({ threadId: z.string().cuid() });

export const seedInboundSchema = z.object({
  customerPhone: phonePkSchema,
  customerName: z.string().trim().max(60).optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(1, "Message required")
    .max(1000, "Keep it under 1000 characters"),
});

export const toggleWhatsAppSchema = z.object({
  enabled: z.boolean(),
  whatsappNumber: phonePkSchema.optional().or(z.literal("")),
});

// Inbound webhook payload — we accept a minimal shape; real Meta/Twilio
// payloads are normalised inside the route handler.
export const webhookPayloadSchema = z.object({
  tenantSlug: z.string().min(3).max(40),
  fromPhone: z.string().min(5).max(20),
  fromName: z.string().max(60).optional(),
  body: z.string().min(1).max(2000),
  providerMessageId: z.string().max(120).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ToggleWhatsAppInput = z.infer<typeof toggleWhatsAppSchema>;
