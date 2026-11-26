import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/errors";
import { chatAboutDocumentWithGemini } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { validateChatRequest } from "@/lib/validation";
import type { ChatApiResponse } from "@/types/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      throw new AppError(
        "Many people are using the app right now, please try again in a minute.",
        429,
        "RATE_LIMITED",
        rate.retryAfterSeconds
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("Invalid JSON request.", 400, "INVALID_JSON");
    }

    const validatedRequest = validateChatRequest(body);
    const answer = await chatAboutDocumentWithGemini(validatedRequest);

    const payload: ChatApiResponse = { answer };
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
