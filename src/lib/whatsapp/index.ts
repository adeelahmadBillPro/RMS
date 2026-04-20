import { FEATURES } from "@/lib/config/app";
import { MockWhatsAppProvider } from "./mock";
import type { WhatsAppProvider } from "./types";

export * from "./types";

let _provider: WhatsAppProvider | null = null;

/**
 * Returns the active WhatsApp provider. When `WHATSAPP_ENABLED=false`
 * the mock provider is still returned — features should additionally
 * gate user-visible behavior on `FEATURES.whatsappEnabled`.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (_provider) return _provider;
  const which = process.env.WHATSAPP_PROVIDER ?? "mock";
  switch (which) {
    case "meta":
    case "twilio":
      // Phase 3 will wire these. Until then we fall back to mock.
      console.warn(
        `[whatsapp] provider "${which}" is not implemented yet — using MockWhatsAppProvider.`,
      );
      _provider = new MockWhatsAppProvider();
      return _provider;
    case "mock":
    default:
      _provider = new MockWhatsAppProvider();
      return _provider;
  }
}

export function isWhatsAppEnabled() {
  return FEATURES.whatsappEnabled;
}
