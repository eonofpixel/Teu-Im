import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side log collector.
 *
 * Receives structured log payloads from the client-side logger utility
 * and writes them to stdout (captured by your hosting platform's log aggregation).
 *
 * For production, extend this to forward to Sentry, Datadog, or a custom sink.
 * Rate-limiting is handled by the global middleware, so this route is safe
 * from log-flooding attacks.
 */

interface LogPayload {
  level: "error" | "warning" | "info";
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  environment: string;
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown as LogPayload;

    // Basic shape validation — reject malformed payloads silently
    if (!body?.level || !body?.source || !body?.message) {
      return NextResponse.json(null, { status: 204 });
    }

    // Structured log output — captured by Vercel / hosting log aggregation
    const logLine = {
      level: body.level,
      source: body.source,
      message: body.message,
      timestamp: body.timestamp || new Date().toISOString(),
      environment: body.environment,
      url: body.url,
      ...(body.stack && { stack: body.stack }),
      ...(body.context && { context: body.context }),
    };

    // Write to stdout — Next.js / Vercel captures this automatically
    console.log(JSON.stringify(logLine));

    // 204 No Content — client does not need a response body
    return NextResponse.json(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Never fail — logging infrastructure must be resilient
    return NextResponse.json(null, { status: 204 });
  }
}
