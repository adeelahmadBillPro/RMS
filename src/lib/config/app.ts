/**
 * Single source of truth for app-wide config.
 * NEVER hardcode the app name in UI/copy — always read from APP.name.
 */
export const APP = {
  name: process.env.APP_NAME ?? "EasyMenu",
  url: process.env.APP_URL ?? "http://localhost:3100",
  supportEmail: "support@easymenu.app",
  description:
    "All-in-one operations platform for restaurants, cafes, fast food, and bakeries.",
  social: {
    twitter: "@easymenu",
  },
  legal: {
    company: "EasyMenu Technologies",
  },
} as const;

export const FEATURES = {
  whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
} as const;

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "demo",
  "super",
  "super-admin",
  "www",
  "auth",
  "login",
  "signup",
  "onboarding",
  "pricing",
  "r",
  "kds",
  "pos",
]);
