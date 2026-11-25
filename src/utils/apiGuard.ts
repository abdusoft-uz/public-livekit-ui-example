import type { NextApiRequest } from "next";

/** Letters, digits, dot, underscore, dash and colon; 1-64 chars. */
const SAFE_NAME = /^[A-Za-z0-9._:-]{1,64}$/;

/**
 * Validates an optional identifier (room name, participant name, agent name).
 * Returns the trimmed value, `undefined` when it is absent or empty,
 * or `null` when it is present but invalid.
 */
export function parseSafeName(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return SAFE_NAME.test(trimmed) ? trimmed : null;
}

/** Best-effort client IP. X-Forwarded-For is only trusted when TRUST_PROXY=true. */
export function getClientIp(req: NextApiRequest): string {
  if (process.env.TRUST_PROXY === "true") {
    const fwd = req.headers["x-forwarded-for"];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || "unknown";
}

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

/**
 * Simple fixed-window, in-memory rate limiter (per server instance).
 * Returns true when the request is allowed.
 */
export function allowRequest(scope: string, ip: string, limit = 30): boolean {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const key = `${scope}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
