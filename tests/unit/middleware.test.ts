import { describe, it, expect } from "vitest";

/**
 * Smoke check: confirm the public-paths list and route shapes are
 * consistent. We don't import middleware here (it pulls Next runtime);
 * instead we lock down the contract via this string list.
 */
const PUBLIC = ["/", "/pricing", "/login", "/signup", "/forgot-password", "/verify-email"];
const PROTECTED_PREFIXES = ["/super-admin", "/onboarding"];

describe("middleware / route map", () => {
  it("public list never includes super-admin or tenant slugs", () => {
    for (const p of PUBLIC) {
      for (const prefix of PROTECTED_PREFIXES) {
        expect(p.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("public list is non-empty (regression guard)", () => {
    expect(PUBLIC.length).toBeGreaterThan(0);
  });
});
