import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/projects", "/settings"];
const AUTH_PATHS = ["/login", "/signup"];

// Public routes that bypass all middleware processing
const PUBLIC_PATHS = [
  "/api/releases",
  "/api/health",
  "/api/audience",
  "/api/join",
  "/download",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");

  // Handle CORS preflight requests for API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-audience-token",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Completely skip middleware for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Allow microphone access for live interpretation
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");

  // Add CORS headers for API routes
  if (pathname.startsWith("/api/") && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // For protected routes, we need to check auth
  // But we can't use @supabase/ssr in Edge Runtime
  // So we'll rely on client-side auth checks and API route protection

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
