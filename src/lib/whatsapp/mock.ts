import type { WhatsAppMessage, WhatsAppProvider } from "./types";

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";
  async sendMessage(msg: WhatsAppMessage) {
    const id = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.info("[whatsapp/mock] →", msg.toPhone, msg.body, { id });
    return { messageId: id };
  }
}
