/**
 * WhatsApp provider abstraction.
 * Phase 1 ships only the MockWhatsAppProvider (logs to console). Phase 3
 * adds MetaCloudProvider implementing the same interface.
 */
export interface WhatsAppMessage {
  toPhone: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(msg: WhatsAppMessage): Promise<{ messageId: string }>;
}
