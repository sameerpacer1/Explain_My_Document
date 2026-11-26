import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as chatPost } from "@/app/api/chat/route";

function clearRateLimitStore() {
  const g = globalThis as unknown as {
    __explainDocRateLimitStore?: Map<string, unknown>;
    __explainDocRateLimitLastSweep?: number;
  };
  g.__explainDocRateLimitStore?.clear();
  g.__explainDocRateLimitLastSweep = 0;
}

function makePngFile(name = "doc.png"): File {
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
  ]);
  return new File([pngHeader], name, { type: "image/png" });
}

function makeAnalyzeResponseJson() {
  return JSON.stringify({
    document_type: "Rent Agreement",
    is_readable: true,
    unreadable_reason: null,
    attention_level: "medium",
    attention_reason: "Check the 60-day notice period.",
    summary: "A residential lease for 11 months.",
    key_facts: [{ label: "Rent", value: "Rs. 20,000" }],
    risk_flags: [],
    action_checklist: [
      { step: "Keep signed copy", deadline: null, priority: "later" },
    ],
    questions_to_ask: ["Is painting mandatory at exit?"],
    document_context: "11-month residential lease at Rs. 20,000 per month.",
  });
}

describe("POST /api/analyze & POST /api/chat routes (mocked Gemini SDK)", () => {
  beforeEach(() => {
    clearRateLimitStore();
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";
    mockGenerateContent.mockReset();
  });

  it("POST /api/analyze analyzes a valid PNG and returns structured JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: makeAnalyzeResponseJson(),
    });

    const form = new FormData();
    form.append("file", makePngFile());
    form.append("language", "Hindi");

    const req = new Request("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.50" },
      body: form,
    });

    const res = await analyzePost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body.analysis.document_type).toBe("Rent Agreement");
    expect(body.documentContext).toContain("Rs. 20,000");

    const geminiCall = mockGenerateContent.mock.calls[0]?.[0];
    expect(geminiCall.contents[0].parts[0].inlineData.mimeType).toBe("image/png");
    expect(geminiCall.config.responseMimeType).toBe("application/json");
  });

  it("POST /api/analyze rejects missing files, invalid languages, and spoofed magic bytes", async () => {
    const missingFileForm = new FormData();
    missingFileForm.append("language", "English");
    const res1 = await analyzePost(
      new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.51" },
        body: missingFileForm,
      })
    );
    expect(res1.status).toBe(400);
    expect((await res1.json()).code).toBe("MISSING_FILE");

    const badLangForm = new FormData();
    badLangForm.append("file", makePngFile());
    badLangForm.append("language", "French");
    const res2 = await analyzePost(
      new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.52" },
        body: badLangForm,
      })
    );
    expect(res2.status).toBe(400);
    expect((await res2.json()).code).toBe("INVALID_LANGUAGE");

    const spoofedForm = new FormData();
    spoofedForm.append(
      "file",
      new File(["not-a-real-png-header"], "fake.png", { type: "image/png" })
    );
    spoofedForm.append("language", "English");
    const res3 = await analyzePost(
      new Request("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.53" },
        body: spoofedForm,
      })
    );
    expect(res3.status).toBe(400);
    expect((await res3.json()).code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("POST /api/chat returns a grounded answer and enforces validation", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "The monthly rent is Rs. 20,000.",
    });

    const parsedAnalysis = JSON.parse(makeAnalyzeResponseJson());
    const { document_context: documentContext, ...analysis } = parsedAnalysis;

    const okReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.60",
      },
      body: JSON.stringify({
        question: "How much is the rent?",
        language: "English",
        documentContext,
        analysis,
        history: [{ role: "user", content: "Hi" }],
      }),
    });

    const okRes = await chatPost(okReq);
    const okJson = await okRes.json();
    expect(okRes.status).toBe(200);
    expect(okJson.answer).toBe("The monthly rent is Rs. 20,000.");

    // Invalid JSON body
    const badJsonRes = await chatPost(
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.61",
        },
        body: "{bad-json",
      })
    );
    expect(badJsonRes.status).toBe(400);
    expect((await badJsonRes.json()).code).toBe("INVALID_JSON");
  });

  it("returns 429 RATE_LIMITED when an IP exceeds 10 requests per minute", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not mentioned in your document.",
    });

    const parsedAnalysis = JSON.parse(makeAnalyzeResponseJson());
    const { document_context: documentContext, ...analysis } = parsedAnalysis;

    const makeChatReq = () =>
      new Request("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.99",
        },
        body: JSON.stringify({
          question: "Any penalty?",
          language: "English",
          documentContext,
          analysis,
          history: [],
        }),
      });

    for (let i = 0; i < 10; i++) {
      const res = await chatPost(makeChatReq());
      expect(res.status).toBe(200);
    }

    const limitedRes = await chatPost(makeChatReq());
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers.get("Retry-After")).toBeTruthy();
    expect((await limitedRes.json()).code).toBe("RATE_LIMITED");
  });
});
