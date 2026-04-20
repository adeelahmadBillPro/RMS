import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { RESERVED_SLUGS } from "@/lib/config/app";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
];

const SUPER_ADMIN_PREFIX = "/super-admin";
const ONBOARDING_PATH = "/onboarding";

function isPublic(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/r/")) return true; // public ordering pages (Phase 2)
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Super-admin gate
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    if (!token.isSuperAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Onboarding routes are open to any authenticated user
  if (pathname.startsWith(ONBOARDING_PATH)) return NextResponse.next();

  // Tenant-scoped routes: /<slug>/...
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];
  if (!slug) return NextResponse.next();

  // Reserved top-level segments are not tenants — let route-level handle 404
  if (RESERVED_SLUGS.has(slug)) return NextResponse.next();

  // The membership check for the slug happens in the layout (server component).
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
