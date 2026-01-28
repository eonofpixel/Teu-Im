import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { generalLimiter, authLimiter, tempKeyLimiter } from "./lib/rate-limit";

const PROTECTED_PATHS = ["/projects", "/settings"];
const AUTH_PATHS = ["/login", "/signup"];

function getApiLimiter(pathname: string) {
  if (pathname.startsWith("/api/login") || pathname.startsWith("/api/signup")) {
    return authLimiter;
  }
  if (pathname.startsWith("/api/soniox/temp-key")) {
    return tempKeyLimiter;
  }
  if (pathname.startsWith("/api/")) {
    return generalLimiter;
  }
  return null;
}

/**
 * Extract a client identifier for rate limiting.
 * Prefers authenticated user ID; falls back to IP from headers.
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;

  // Standard headers set by reverse proxies / hosting platforms
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return `ip:${forwarded.split(",")[0].trim()}`;

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp}`;

  return "ip:unknown";
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Supabase 세션 갱신
  const { session } = await updateSession(request, response);

  const pathname = request.nextUrl.pathname;

  // ── Rate limiting for API routes ──────────────────────────────────
  const limiter = getApiLimiter(pathname);
  if (limiter) {
    const identifier = getClientIdentifier(request, session?.user?.id);
    const result = limiter.check(identifier);

    // Attach rate-limit headers to all API responses
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));

    if (!result.allowed) {
      return NextResponse.json(
        { error: "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
            "Retry-After": String(
              Math.ceil((result.resetAt - Date.now()) / 1000)
            ),
            "Cache-Control": "no-store",
          },
        }
      );
    }
  }

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
