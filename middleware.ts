import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that require authentication
const protectedPaths = ["/account"];

// Paths that require admin role
const adminPaths = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const isAdmin = req.auth?.user?.role === "admin";

  // Check protected paths
  for (const path of protectedPaths) {
    if (pathname.startsWith(path)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Check admin paths
  for (const path of adminPaths) {
    if (pathname.startsWith(path)) {
      if (!isAuthenticated) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     * - /t/ (NFC tag tap routes — must be public)
     * - /list (NFC visitor shopping list — must be public)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.webmanifest|api|t/|list).*)",
  ],
};
