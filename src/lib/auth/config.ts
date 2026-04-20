import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "./password";
import { loginSchema } from "@/lib/validations/auth.schema";

const googleEnabled = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    CredentialsProvider({
      name: "Email + password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.deletedAt) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id && typeof token.id === "string") {
        // Re-fetch isSuperAdmin + memberships on each JWT mint
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            isSuperAdmin: true,
            memberships: {
              where: { deletedAt: null },
              select: {
                role: true,
                tenant: { select: { id: true, slug: true, name: true, onboardedAt: true } },
              },
            },
          },
        });
        if (dbUser) {
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.memberships = dbUser.memberships.map((m) => ({
            role: m.role,
            tenantId: m.tenant.id,
            tenantSlug: m.tenant.slug,
            tenantName: m.tenant.name,
            onboarded: !!m.tenant.onboardedAt,
          }));
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = !!token.isSuperAdmin;
        session.user.memberships = (token.memberships as typeof session.user.memberships) ?? [];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
