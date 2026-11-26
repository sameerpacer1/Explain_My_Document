import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

interface RateLimitBucket {
  timestamps: number[];
}

// Keep map on globalThis so hot reloads in dev don't leak duplicate intervals
const globalForRateLimit = globalThis as unknown as {
  __explainDocRateLimitStore?: Map<string, RateLimitBucket>;
  __explainDocRateLimitLastSweep?: number;
};

const store =
  globalForRateLimit.__explainDocRateLimitStore ??
  new Map<string, RateLimitBucket>();
globalForRateLimit.__explainDocRateLimitStore = store;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Extracts a best-effort client IP from standard proxy headers without logging PII.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "local-anonymous";
}

/**
 * Simple in-memory sliding-window per-IP rate limiter.
 */
export function checkRateLimit(
  ip: string,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Periodic sweep of stale buckets to keep memory bounded
  const lastSweep = globalForRateLimit.__explainDocRateLimitLastSweep ?? 0;
  if (now - lastSweep > windowMs) {
    for (const [key, bucket] of store.entries()) {
      const active = bucket.timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        store.delete(key);
      } else {
        bucket.timestamps = active;
      }
    }
    globalForRateLimit.__explainDocRateLimitLastSweep = now;
  }

  const existing = store.get(ip) ?? { timestamps: [] };
  const activeTimestamps = existing.timestamps.filter((t) => t > windowStart);

  if (activeTimestamps.length >= maxRequests) {
    const oldest = activeTimestamps[0] ?? now;
    const retryAfterMs = Math.max(1000, oldest + windowMs - now);
    store.set(ip, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  activeTimestamps.push(now);
  store.set(ip, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - activeTimestamps.length),
    retryAfterSeconds: 0,
  };
}
