/**
 * Simple in-process rate limiter for Phase 1 → Phase 3.
 *
 * Backed by a Map so it's per-Node-process — fine for a single-instance
 * dev/staging server, NOT good enough for multi-instance production.
 * Phase 5 swaps this for Upstash Redis (`@upstash/ratelimit`) — keep
 * the function signature stable so the swap is one file.
 */

type Bucket = { count: number; expiresAt: number };
const store = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number; // epoch ms
};

/**
 * Allow up to `limit` hits for a given `key` within `windowMs`.
 * Returns ok=false once exhausted; resets when the window expires.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.expiresAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, expiresAt: resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.expiresAt };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.expiresAt };
}

/** Clear a key — useful in tests; never call from request handlers. */
export function rateLimitReset(key: string) {
  store.delete(key);
}
