/**
 * Audience token utilities for short-lived project access.
 *
 * Token format: base64url-encoded JSON payload + "." + base64url-encoded HMAC-SHA256 signature.
 *
 * Payload schema:
 *   { projectId: string, sessionId: string | null, expiresAt: string (ISO 8601) }
 *
 * The signing key is resolved from:
 *   1. process.env.AUDIENCE_TOKEN_SECRET (preferred)
 *   2. Derived from NEXT_PUBLIC_SUPABASE_URL (fallback — deterministic, not random)
 */

import { createHmac } from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AudienceTokenPayload {
  projectId: string;
  sessionId: string | null;
  expiresAt: string; // ISO 8601
}

// ─── Key resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the signing secret.
 * Falls back to a key derived from the Supabase URL so the system
 * works out of the box without requiring a new env var to be set.
 */
function resolveSecret(): string {
  if (process.env.AUDIENCE_TOKEN_SECRET) {
    return process.env.AUDIENCE_TOKEN_SECRET;
  }

  // Derive from Supabase URL — unique per project but stable across restarts
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "fallback-secret-change-me";
  return createHmac("sha256", "teu-im-audience-derive").update(supabaseUrl).digest("hex");
}

// ─── Encoding helpers ────────────────────────────────────────────────────────

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  // Restore padding
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64url").toString("utf8");
}

// ─── Sign ────────────────────────────────────────────────────────────────────

function sign(payload: string): string {
  const secret = resolveSecret();
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a signed, short-lived audience access token.
 */
export function generateToken(
  projectId: string,
  sessionId: string | null,
  expiresAt: string
): string {
  const payload: AudienceTokenPayload = { projectId, sessionId, expiresAt };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a token's signature and expiry.
 *
 * Returns the decoded payload on success, or `null` if the token
 * is malformed, the signature is invalid, or the token has expired.
 */
export function verifyToken(token: string): AudienceTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;

    // Re-sign and compare
    const expectedSignature = sign(encodedPayload);
    if (signature !== expectedSignature) return null;

    // Decode payload
    const raw = fromBase64Url(encodedPayload);
    const payload = JSON.parse(raw) as AudienceTokenPayload;

    // Validate shape
    if (!payload.projectId || typeof payload.expiresAt !== "string") return null;

    // Check expiry
    if (new Date(payload.expiresAt) <= new Date()) return null;

    return payload;
  } catch {
    return null;
  }
}
