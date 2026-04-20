import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import type { Session } from "next-auth";

export function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.user.isSuperAdmin) throw new Error("FORBIDDEN");
  return session;
}
