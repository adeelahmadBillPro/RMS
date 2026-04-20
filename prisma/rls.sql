-- =====================================================================
-- EasyMenu — Postgres Row-Level Security setup
--
-- Defense-in-depth ONLY. The application's Prisma helpers
-- (lib/db/tenant-client.ts) inject tenantId into every query — RLS is
-- the second line of defense. Applied AFTER `prisma migrate dev`.
--
-- Run with:   pnpm prisma:rls
--
-- Pattern: each tenant-scoped table enables RLS, has a USING policy
-- that restricts access to rows where tenant_id = current_setting(
--   'app.current_tenant_id'
-- ). The app must `SET LOCAL app.current_tenant_id = '<id>'` per tx.
-- =====================================================================

-- Helper: the current tenant set per-connection by the app layer.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.current_tenant_id', true)
$$;

-- TenantMembership ----------------------------------------------------
ALTER TABLE "TenantMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_membership_isolation ON "TenantMembership";
CREATE POLICY tenant_membership_isolation ON "TenantMembership"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- MenuCategorySeed ----------------------------------------------------
ALTER TABLE "MenuCategorySeed" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_category_seed_isolation ON "MenuCategorySeed";
CREATE POLICY menu_category_seed_isolation ON "MenuCategorySeed"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- AuditLog ------------------------------------------------------------
-- Platform-level rows have tenantId NULL and are visible only when no
-- tenant is set (super-admin context).
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_isolation ON "AuditLog";
CREATE POLICY audit_log_isolation ON "AuditLog"
  USING (
    "tenantId" = current_tenant_id()
    OR current_tenant_id() IS NULL
  );

-- NOTE: Tenant table itself is NOT row-level-locked because users need
-- to look up their own tenant before a tenant context exists. Access
-- is gated at the application layer via TenantMembership.
