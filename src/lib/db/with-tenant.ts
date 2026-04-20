import { prisma } from "./client";

/**
 * Run `fn` inside a transaction with `app.current_tenant_id` set,
 * so Postgres RLS policies (prisma/rls.sql) take effect.
 *
 * Use this for any read/write that crosses RLS-protected tables:
 *
 *   const items = await withTenant(tenantId, (tx) =>
 *     tx.menuCategorySeed.findMany()
 *   );
 *
 * If `tenantId` is null (super-admin context), no GUC is set — RLS
 * policies treat that as "see everything".
 */
export async function withTenant<T>(
  tenantId: string | null,
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (tenantId) {
      // set_config(name, value, is_local=true) scopes to this transaction
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
    }
    return fn(tx);
  });
}
