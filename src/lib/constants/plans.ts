/**
 * Phase 1 plan seed values. These are upserted on app boot via the seed
 * script — do NOT rely on this object at runtime to read prices.
 */
export const PLAN_SEED = [
  {
    code: "trial",
    name: "Free trial",
    description: "14 days, every feature unlocked.",
    priceCents: 0,
    currency: "PKR",
    maxBranches: 1,
    maxStaff: 5,
    whatsappEnabled: true,
    apiEnabled: false,
  },
  {
    code: "basic",
    name: "Basic",
    description: "Single outlet, the essentials.",
    priceCents: 450_000, // PKR 4,500
    currency: "PKR",
    maxBranches: 1,
    maxStaff: 5,
    whatsappEnabled: false,
    apiEnabled: false,
  },
  {
    code: "pro",
    name: "Pro",
    description: "Up to 3 branches, WhatsApp, delivery.",
    priceCents: 990_000, // PKR 9,900
    currency: "PKR",
    maxBranches: 3,
    maxStaff: 20,
    whatsappEnabled: true,
    apiEnabled: false,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited everything + API.",
    priceCents: 0, // custom
    currency: "PKR",
    maxBranches: 999,
    maxStaff: 9999,
    whatsappEnabled: true,
    apiEnabled: true,
  },
] as const;

export const TRIAL_DAYS = 14;
