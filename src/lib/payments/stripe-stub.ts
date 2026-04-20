/**
 * Stripe SaaS subscription stub for Phase 1.
 *
 * Real Stripe wiring (checkout session, customer portal, webhook signing)
 * lands in Phase 5. The stub exists so subscription-aware code can
 * import a stable surface today without reaching for `process.env`.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export type CheckoutSessionInput = {
  tenantId: string;
  planCode: "basic" | "pro" | "enterprise";
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(_input: CheckoutSessionInput): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  // Phase 5 implementation goes here.
  throw new Error("CHECKOUT_NOT_IMPLEMENTED_YET");
}
