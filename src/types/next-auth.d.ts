import type { TenantRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

export type SessionMembership = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: TenantRole;
  onboarded: boolean;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
      memberships: SessionMembership[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isSuperAdmin?: boolean;
    memberships?: SessionMembership[];
  }
}
