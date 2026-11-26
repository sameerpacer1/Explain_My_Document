import { NextResponse } from "next/server";
import { AppError, handleApiError } from "@/lib/errors";
import { analyzeDocumentWithGemini } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  isSupportedLanguage,
  matchesFileMagicBytes,
  validateUploadedFileMeta,
} from "@/lib/validation";
import type { AnalyzeApiResponse } from "@/types/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AppError(
        "Invalid upload payload. Please select a valid image or PDF file.",
        400,
        "INVALID_FORM_DATA"
      );
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      throw new AppError(
        "Please upload a photo or PDF of your document.",
        400,
        "MISSING_FILE"
      );
    }

    const languageEntry = formData.get("language");
    if (!isSupportedLanguage(languageEntry)) {
      throw new AppError(
        "Please select one of the supported output languages.",
        400,
        "INVALID_LANGUAGE"
      );
    }

    const mimeType = validateUploadedFileMeta(fileEntry);

    // Read file strictly in memory; never write to disk or log contents
    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!matchesFileMagicBytes(buffer, mimeType)) {
      throw new AppError(
        "The file content does not match a valid JPG, PNG, WebP, or PDF document.",
        400,
        "UNSUPPORTED_FILE_TYPE"
      );
    }

    const base64Data = buffer.toString("base64");

    const result: AnalyzeApiResponse = await analyzeDocumentWithGemini({
      base64Data,
      mimeType,
      language: languageEntry,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
