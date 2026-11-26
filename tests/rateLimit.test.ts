import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

function clearRateLimitStore() {
  const g = globalThis as unknown as {
    __explainDocRateLimitStore?: Map<string, unknown>;
    __explainDocRateLimitLastSweep?: number;
  };
  g.__explainDocRateLimitStore?.clear();
  g.__explainDocRateLimitLastSweep = 0;
}

describe("In-memory per-IP rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T10:00:00Z"));
    clearRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to maxRequests within the window and blocks the next request", () => {
    const ip = "203.0.113.10";

    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(ip, 10, 60_000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(10 - (i + 1));
    }

    const blocked = checkRateLimit(ip, 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("tracks separate IPs independently and resets after the window expires", () => {
    const ipA = "198.51.100.1";
    const ipB = "198.51.100.2";

    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ipA, 10, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(ipA, 10, 60_000).allowed).toBe(false);

    // Different IP is unaffected
    expect(checkRateLimit(ipB, 10, 60_000).allowed).toBe(true);

    // Advance past 60s window
    vi.advanceTimersByTime(61_000);
    const afterWindow = checkRateLimit(ipA, 10, 60_000);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(9);
  });

  it("extracts client IP safely from proxy headers", () => {
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }))
    ).toBe("10.0.0.1");
    expect(getClientIp(new Headers({ "x-real-ip": "172.16.0.5" }))).toBe(
      "172.16.0.5"
    );
    expect(getClientIp(new Headers())).toBe("local-anonymous");
  });
});
