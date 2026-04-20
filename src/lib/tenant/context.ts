import { requireSession } from "@/lib/auth/session";
import type { SessionMembership } from "@/types/next-auth";

export type TenantContext = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  membership: SessionMembership;
};

/**
 * Resolve the current tenant from the session + the slug in the URL.
 * Throws FORBIDDEN if the user has no membership in this tenant.
 *
 * NEVER trust a tenantId from the request body — always derive from
 * the URL slug + the user's verified memberships in the JWT.
 */
export async function getTenantContext(slug: string): Promise<TenantContext> {
  const session = await requireSession();
  const membership = session.user.memberships.find((m) => m.tenantSlug === slug);
  if (!membership) {
    if (session.user.isSuperAdmin) {
      // Super admin impersonation flow happens via a separate explicit action,
      // not by silently granting tenant access here.
      throw new Error("FORBIDDEN_USE_IMPERSONATION");
    }
    throw new Error("FORBIDDEN");
  }
  return {
    userId: session.user.id,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenantSlug,
    membership,
  };
}
