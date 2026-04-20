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

-- Branch --------------------------------------------------------------
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS branch_isolation ON "Branch";
CREATE POLICY branch_isolation ON "Branch"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- MenuCategory --------------------------------------------------------
ALTER TABLE "MenuCategory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_category_isolation ON "MenuCategory";
CREATE POLICY menu_category_isolation ON "MenuCategory"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- MenuItem ------------------------------------------------------------
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_item_isolation ON "MenuItem";
CREATE POLICY menu_item_isolation ON "MenuItem"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Supplier ------------------------------------------------------------
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_isolation ON "Supplier";
CREATE POLICY supplier_isolation ON "Supplier"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Ingredient ----------------------------------------------------------
ALTER TABLE "Ingredient" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ingredient_isolation ON "Ingredient";
CREATE POLICY ingredient_isolation ON "Ingredient"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- StockMovement -------------------------------------------------------
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stock_movement_isolation ON "StockMovement";
CREATE POLICY stock_movement_isolation ON "StockMovement"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Purchase ------------------------------------------------------------
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_isolation ON "Purchase";
CREATE POLICY purchase_isolation ON "Purchase"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- RestaurantTable -----------------------------------------------------
ALTER TABLE "RestaurantTable" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS restaurant_table_isolation ON "RestaurantTable";
CREATE POLICY restaurant_table_isolation ON "RestaurantTable"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Customer ------------------------------------------------------------
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_isolation ON "Customer";
CREATE POLICY customer_isolation ON "Customer"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Order ---------------------------------------------------------------
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_isolation ON "Order";
CREATE POLICY order_isolation ON "Order"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- Payment -------------------------------------------------------------
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_isolation ON "Payment";
CREATE POLICY payment_isolation ON "Payment"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- OrderItem / OrderItemModifier / OrderStatusLog: scoped transitively
-- via Order; queries always start from a tenant-scoped Order.

-- DeliveryAssignment --------------------------------------------------
ALTER TABLE "DeliveryAssignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_assignment_isolation ON "DeliveryAssignment";
CREATE POLICY delivery_assignment_isolation ON "DeliveryAssignment"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- DeliveryCashSubmission ----------------------------------------------
ALTER TABLE "DeliveryCashSubmission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS delivery_cash_isolation ON "DeliveryCashSubmission";
CREATE POLICY delivery_cash_isolation ON "DeliveryCashSubmission"
  USING ("tenantId" = current_tenant_id() OR current_tenant_id() IS NULL);

-- MenuVariant / ModifierGroup / Modifier are isolated transitively via
-- MenuItem; explicit per-table policies would require denormalising
-- tenantId. Phase 1 ships parent-table RLS only — application-layer
-- queries always start from a tenant-scoped MenuItem, so leakage is
-- gated. Add full per-table tenantId in Phase 5 if RLS audit demands it.

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
