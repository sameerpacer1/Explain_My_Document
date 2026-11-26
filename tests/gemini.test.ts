import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      BOOLEAN: "BOOLEAN",
      ARRAY: "ARRAY",
      NUMBER: "NUMBER",
    },
  };
});

import {
  analyzeDocumentWithGemini,
  chatAboutDocumentWithGemini,
} from "@/lib/gemini";

function validAnalysisJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    document_type: "Electricity Bill",
    is_readable: true,
    unreadable_reason: null,
    attention_level: "high",
    attention_reason: "Pay Rs. 9,511 by 05 Dec to avoid disconnection.",
    summary: "Your electricity bill has overdue charges from October.",
    key_facts: [{ label: "Total Payable", value: "Rs. 9,511" }],
    risk_flags: [
      {
        severity: "high",
        clause: "Disconnection notice under Section 56",
        why_it_matters: "Power can be cut off if unpaid after 05 Dec.",
      },
    ],
    action_checklist: [
      { step: "Pay the bill online", deadline: "05 Dec 2026", priority: "urgent" },
    ],
    questions_to_ask: ["Can I pay in two installments?"],
    document_context: "Total due Rs. 9,511 by 05 Dec 2026.",
    ...overrides,
  });
}

describe("Gemini helper: retries & 429 fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries once with strict JSON instruction when first response is malformed JSON", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "{broken json without closing brace" })
      .mockResolvedValueOnce({
        text: `\`\`\`json\n${validAnalysisJson({
          summary: "<script>alert(1)</script>Simple bill summary.",
        })}\n\`\`\``,
      });

    const result = await analyzeDocumentWithGemini({
      base64Data: "ZmFrZQ==",
      mimeType: "image/png",
      language: "English",
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockGenerateContent.mock.calls[1]?.[0];
    expect(JSON.stringify(secondCallArgs.contents)).toContain(
      "Return valid JSON only"
    );
    expect(result.analysis.document_type).toBe("Electricity Bill");
    expect(result.analysis.summary).toBe("alert(1)Simple bill summary.");
  });

  it("throws AI_INVALID_RESPONSE when both JSON parse attempts fail", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({ text: "{still: bad}" });

    await expect(
      analyzeDocumentWithGemini({
        base64Data: "ZmFrZQ==",
        mimeType: "image/png",
        language: "English",
      })
    ).rejects.toMatchObject({
      name: "AppError",
      code: "AI_INVALID_RESPONSE",
      statusCode: 502,
    });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("falls back to GEMINI_FALLBACK_MODEL after backoff when primary returns 429", async () => {
    const rateError = Object.assign(new Error("RESOURCE_EXHAUSTED: 429"), {
      status: 429,
    });

    mockGenerateContent
      .mockRejectedValueOnce(rateError)
      .mockResolvedValueOnce({ text: validAnalysisJson() });

    const promise = analyzeDocumentWithGemini({
      base64Data: "ZmFrZQ==",
      mimeType: "image/png",
      language: "Hindi",
    });

    await vi.advanceTimersByTimeAsync(1500);
    const result = await promise;

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0]?.[0]?.model).toBe("gemini-3.5-flash");
    expect(mockGenerateContent.mock.calls[1]?.[0]?.model).toBe(
      "gemini-3.5-flash-lite"
    );
    expect(result.analysis.document_type).toBe("Electricity Bill");
  });

  it("throws 429 AI_QUOTA_EXCEEDED if both primary and fallback return 429", async () => {
    const quotaErr = Object.assign(new Error("Quota exceeded (429)"), {
      status: 429,
    });

    mockGenerateContent
      .mockRejectedValueOnce(quotaErr)
      .mockRejectedValueOnce(quotaErr);

    const promise = chatAboutDocumentWithGemini({
      question: "What is the due date?",
      language: "English",
      documentContext: "Due date is 05 Dec 2026.",
      analysis: {
        document_type: "Electricity Bill",
        is_readable: true,
        unreadable_reason: null,
        attention_level: "high",
        attention_reason: "Pay soon",
        summary: "Bill summary",
        key_facts: [],
        risk_flags: [],
        action_checklist: [],
        questions_to_ask: [],
      },
      history: [],
    });

    await Promise.all([
      expect(promise).rejects.toMatchObject({
        statusCode: 429,
        code: "AI_QUOTA_EXCEEDED",
      }),
      vi.advanceTimersByTimeAsync(1500),
    ]);
  });

  it("throws CONFIGURATION_ERROR if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      analyzeDocumentWithGemini({
        base64Data: "ZmFrZQ==",
        mimeType: "image/png",
        language: "English",
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
