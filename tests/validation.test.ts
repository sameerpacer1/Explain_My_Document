import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import {
  isAllowedMimeType,
  isSupportedLanguage,
  matchesFileMagicBytes,
  validateChatRequest,
  validateDocumentAnalysis,
  validateUploadedFileMeta,
} from "@/lib/validation";

function createValidRawAnalysis() {
  return {
    document_type: "Rental Agreement",
    is_readable: true,
    unreadable_reason: null,
    attention_level: "high",
    attention_reason: "Includes a 6-month lock-in and heavy late penalty.",
    summary: "This is an 11-month flat rental agreement.",
    key_facts: [{ label: "Monthly Rent", value: "Rs. 32,000" }],
    risk_flags: [
      {
        severity: "high",
        clause: "6-month lock-in for tenant only",
        why_it_matters: "You lose your deposit if you leave early.",
      },
    ],
    action_checklist: [
      {
        step: "Ask to make the lock-in equal for both sides",
        deadline: "Before signing",
        priority: "urgent",
      },
    ],
    questions_to_ask: ["Can we reduce the lock-in period to 3 months?"],
    document_context: "Monthly rent Rs. 32,000, deposit Rs. 1,50,000.",
  };
}

describe("File type & size validation", () => {
  it("allows supported MIME types and rejects unsupported ones", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("image/webp")).toBe(true);
    expect(isAllowedMimeType("application/pdf")).toBe(true);

    expect(isAllowedMimeType("image/gif")).toBe(false);
    expect(isAllowedMimeType("text/plain")).toBe(false);
    expect(isAllowedMimeType("application/zip")).toBe(false);
  });

  it("validates file metadata: rejects empty, >8MB, and unsupported MIME types", () => {
    const emptyFile = new File([], "empty.png", { type: "image/png" });
    expect(() => validateUploadedFileMeta(emptyFile)).toThrowError(AppError);
    try {
      validateUploadedFileMeta(emptyFile);
    } catch (err) {
      expect((err as AppError).code).toBe("EMPTY_FILE");
      expect((err as AppError).statusCode).toBe(400);
    }

    const oversizedBuffer = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const oversizedFile = new File([oversizedBuffer], "big.pdf", {
      type: "application/pdf",
    });
    try {
      validateUploadedFileMeta(oversizedFile);
      expect.fail("Expected FILE_TOO_LARGE");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("FILE_TOO_LARGE");
      expect((err as AppError).statusCode).toBe(413);
    }

    const unsupportedFile = new File(["hello"], "notes.txt", {
      type: "text/plain",
    });
    try {
      validateUploadedFileMeta(unsupportedFile);
      expect.fail("Expected UNSUPPORTED_FILE_TYPE");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("UNSUPPORTED_FILE_TYPE");
      expect((err as AppError).statusCode).toBe(400);
    }
  });

  it("accepts a valid file right at the 8 MB boundary", () => {
    const exactLimit = new Uint8Array(MAX_FILE_SIZE_BYTES);
    const validFile = new File([exactLimit], "doc.pdf", {
      type: "application/pdf",
    });
    expect(validateUploadedFileMeta(validFile)).toBe("application/pdf");
  });

  it("verifies magic bytes for JPEG, PNG, WebP, and PDF and rejects spoofing", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const webp = Buffer.from("RIFF1234WEBP", "ascii");
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj", "ascii");
    const textDisguised = Buffer.from("not really a png file at all", "ascii");

    expect(matchesFileMagicBytes(jpeg, "image/jpeg")).toBe(true);
    expect(matchesFileMagicBytes(png, "image/png")).toBe(true);
    expect(matchesFileMagicBytes(webp, "image/webp")).toBe(true);
    expect(matchesFileMagicBytes(pdf, "application/pdf")).toBe(true);

    expect(matchesFileMagicBytes(textDisguised, "image/png")).toBe(false);
    expect(matchesFileMagicBytes(jpeg, "application/pdf")).toBe(false);
    expect(matchesFileMagicBytes(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg")).toBe(
      false
    );
  });
});

describe("Analysis JSON schema validation", () => {
  it("accepts a valid schema payload and normalizes enum casing", () => {
    const raw = createValidRawAnalysis();
    raw.attention_level = "HIGH";
    raw.risk_flags[0].severity = "MEDIUM";
    raw.action_checklist[0].priority = "URGENT";

    const parsed = validateDocumentAnalysis(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.attention_level).toBe("high");
    expect(parsed?.risk_flags[0]?.severity).toBe("medium");
    expect(parsed?.action_checklist[0]?.priority).toBe("urgent");
  });

  it("rejects malformed or missing required fields", () => {
    expect(validateDocumentAnalysis(null)).toBeNull();
    expect(validateDocumentAnalysis([])).toBeNull();

    const missingSummary = { ...createValidRawAnalysis(), summary: 123 };
    expect(validateDocumentAnalysis(missingSummary)).toBeNull();

    const badAttention = { ...createValidRawAnalysis(), attention_level: "critical" };
    expect(validateDocumentAnalysis(badAttention)).toBeNull();

    const badRiskSeverity = {
      ...createValidRawAnalysis(),
      risk_flags: [{ severity: "extreme", clause: "x", why_it_matters: "y" }],
    };
    expect(validateDocumentAnalysis(badRiskSeverity)).toBeNull();

    const badPriority = {
      ...createValidRawAnalysis(),
      action_checklist: [{ step: "Pay", deadline: null, priority: "asap" }],
    };
    expect(validateDocumentAnalysis(badPriority)).toBeNull();

    const badQuestions = {
      ...createValidRawAnalysis(),
      questions_to_ask: [42],
    };
    expect(validateDocumentAnalysis(badQuestions)).toBeNull();
  });
});

describe("Language and chat request validation", () => {
  it("checks supported languages", () => {
    expect(isSupportedLanguage("English")).toBe(true);
    expect(isSupportedLanguage("Hindi")).toBe(true);
    expect(isSupportedLanguage("Malayalam")).toBe(true);
    expect(isSupportedLanguage("Spanish")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });

  it("sanitizes chat request inputs and bounds history", () => {
    const { document_context: _ctx, ...analysisWithoutContext } =
      createValidRawAnalysis();
    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
    }));

    const validated = validateChatRequest({
      question: "<b>What is the rent?</b>",
      language: "Hindi",
      documentContext: "Rent is Rs. 32,000.",
      analysis: analysisWithoutContext,
      history: longHistory,
    });

    expect(validated.question).toBe("What is the rent?");
    expect(validated.language).toBe("Hindi");
    expect(validated.history).toHaveLength(12);
    expect(validated.history[0]?.content).toBe("Message 8");
  });
});
