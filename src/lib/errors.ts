import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types/document";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isRateOrQuotaMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  );
}

/**
 * Converts unknown errors into safe, user-friendly JSON responses.
 * Never exposes stack traces, API keys, or document contents.
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof AppError) {
    const headers: Record<string, string> = {};
    if (error.retryAfterSeconds) {
      headers["Retry-After"] = String(error.retryAfterSeconds);
    }

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.retryAfterSeconds
          ? { retryAfterSeconds: error.retryAfterSeconds }
          : {}),
      },
      { status: error.statusCode, headers }
    );
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  if (isRateOrQuotaMessage(rawMessage)) {
    return NextResponse.json(
      {
        error: "Many people are using the app right now, please try again in a minute.",
        code: "RATE_LIMITED",
        retryAfterSeconds: 60,
      },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Log only safe error metadata on server (never document content or keys)
  console.error("[API Error]", error instanceof Error ? error.name : "UnknownError");

  return NextResponse.json(
    {
      error: "We could not process your request right now. Please try again in a moment.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
