import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const PROTECTED_PATHS = ["/projects", "/settings"];
const AUTH_PATHS = ["/login", "/signup"];

// Public API routes that don't need Supabase session
const PUBLIC_API_PATHS = [
  "/api/releases",
  "/api/health",
  "/api/audience",
  "/api/join",
];

/**
 * Get allowed CORS origins based on environment
 * In production, only allow specific domains
 * In development, allow localhost with any port
 */
function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    // In development, allow localhost with any port
    return ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];
  }

  // In production, use ALLOWED_ORIGINS env var or fall back to NEXT_PUBLIC_APP_URL
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (allowedOriginsEnv) {
    return allowedOriginsEnv.split(",").map((origin) => origin.trim());
  }

  // Default to app URL if set
  return appUrl ? [appUrl] : [];
}

/**
 * Check if origin is allowed based on environment configuration
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  const isDevelopment = process.env.NODE_ENV === "development";

  // In development, allow localhost with any port
  if (isDevelopment) {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
  }

  return allowedOrigins.includes(origin);
}

/**
 * Generate Content Security Policy header
 */
function getCSPHeader(supabaseUrl?: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Base CSP directives
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      // Next.js requires unsafe-eval and unsafe-inline in development
      ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : ["'unsafe-inline'"]),
    ],
    "style-src": ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      // Allow Supabase connections
      ...(supabaseUrl ? [supabaseUrl, supabaseUrl.replace("https://", "wss://")] : []),
    ],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  // Convert to CSP string
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}


export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");

  // Handle CORS preflight requests for all API routes
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const allowedOrigin = isOriginAllowed(origin) ? origin : null;

    return new NextResponse(null, {
      status: 204,
      headers: {
        ...(allowedOrigin && {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Credentials": "true",
        }),
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-audience-token",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Add security headers
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  response.headers.set("Content-Security-Policy", getCSPHeader(supabaseUrl));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=()"
  );

  // Add CORS headers for API routes if origin is allowed
  if (pathname.startsWith("/api/") && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Check if this is a public API route that doesn't need Supabase
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  // Skip Supabase session for public API routes
  if (isPublicApi) {
    return response;
  }

  // Supabase 세션 갱신 (only for non-public routes)
  const { session } = await updateSession(request, response);

  // ── Route guards ──────────────────────────────────────────────────

  // 보호된 경로에 세션 없이 접속 시 로그인 페이지로 리다이렉트
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 이미 로그인된 사용자가 인증 페이지에 접속 시 대시보드로 리다이렉트
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage && session) {
    return NextResponse.redirect(
      new URL("/projects", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
