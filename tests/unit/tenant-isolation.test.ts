import { describe, it, expect } from "vitest";
import { RESERVED_SLUGS } from "@/lib/config/app";

/**
 * Smoke test: reserved slugs cannot collide with tenant URLs.
 *
 * Real cross-tenant DB isolation is enforced by `withTenant` + Postgres
 * RLS (prisma/rls.sql). Those policies need a live DB to test, so the
 * full integration test lands in Phase 2 alongside the order pipeline.
 */
describe("tenant isolation / reserved slugs", () => {
  it("blocks reserved slugs from being used as tenant URLs", () => {
    for (const reserved of ["admin", "api", "super-admin", "r"]) {
      expect(RESERVED_SLUGS.has(reserved)).toBe(true);
    }
  });

  it("allows ordinary tenant slugs", () => {
    for (const ok of ["burgerhub", "the-cafe", "kitchen-7"]) {
      expect(RESERVED_SLUGS.has(ok)).toBe(false);
    }
  });
});
