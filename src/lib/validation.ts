import {
  ALLOWED_MIME_TYPES,
  MAX_CHAT_HISTORY_TURNS,
  MAX_CHAT_QUESTION_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  SUPPORTED_LANGUAGE_SET,
} from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { sanitizeText } from "@/lib/sanitize";
import type {
  ActionItem,
  ActionPriority,
  AllowedMimeType,
  AttentionLevel,
  ChatApiRequest,
  ChatMessage,
  ClientDocumentAnalysis,
  DocumentAnalysis,
  KeyFact,
  RiskFlag,
  RiskSeverity,
  SupportedLanguage,
} from "@/types/document";

const ATTENTION_LEVELS = new Set<AttentionLevel>(["low", "medium", "high"]);
const RISK_SEVERITIES = new Set<RiskSeverity>(["low", "medium", "high"]);
const ACTION_PRIORITIES = new Set<ActionPriority>(["urgent", "soon", "later"]);

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGE_SET.has(value as SupportedLanguage);
}

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Verifies file header bytes match the declared MIME type to guard against
 * renamed or corrupted uploads.
 */
export function matchesFileMagicBytes(buffer: Buffer, mimeType: AllowedMimeType): boolean {
  if (buffer.length < 12) return false;

  switch (mimeType) {
    case "image/jpeg":
      // JPEG starts with FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      // PNG starts with 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/webp":
      // RIFF....WEBP
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "application/pdf":
      // %PDF-
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    default:
      return false;
  }
}

export function validateUploadedFileMeta(file: File): AllowedMimeType {
  if (!file || file.size === 0) {
    throw new AppError(
      "The uploaded file is empty. Please choose a valid photo or PDF.",
      400,
      "EMPTY_FILE"
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      `This file is larger than ${MAX_FILE_SIZE_LABEL}. Please upload a smaller image or PDF.`,
      413,
      "FILE_TOO_LARGE"
    );
  }

  const normalizedType = file.type.toLowerCase().trim();
  if (!isAllowedMimeType(normalizedType)) {
    throw new AppError(
      "Unsupported file type. Please upload a JPG, PNG, WebP image, or a PDF file.",
      400,
      "UNSUPPORTED_FILE_TYPE"
    );
  }

  return normalizedType;
}

/**
 * Runtime structural validator for the JSON returned by Gemini /api/analyze.
 */
export function validateDocumentAnalysis(raw: unknown): DocumentAnalysis | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.document_type !== "string") return null;
  if (typeof obj.is_readable !== "boolean") return null;
  if (
    obj.unreadable_reason !== null &&
    obj.unreadable_reason !== undefined &&
    typeof obj.unreadable_reason !== "string"
  ) {
    return null;
  }

  const attentionLevel =
    typeof obj.attention_level === "string"
      ? (obj.attention_level.toLowerCase() as AttentionLevel)
      : null;
  if (!attentionLevel || !ATTENTION_LEVELS.has(attentionLevel)) {
    return null;
  }

  if (typeof obj.attention_reason !== "string") return null;
  if (typeof obj.summary !== "string") return null;
  if (!Array.isArray(obj.key_facts)) return null;
  if (!Array.isArray(obj.risk_flags)) return null;
  if (!Array.isArray(obj.action_checklist)) return null;
  if (!Array.isArray(obj.questions_to_ask)) return null;
  if (typeof obj.document_context !== "string") return null;

  const keyFacts: KeyFact[] = [];
  for (const item of obj.key_facts) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    if (typeof rec.label !== "string" || typeof rec.value !== "string") return null;
    keyFacts.push({ label: rec.label, value: rec.value });
  }

  const riskFlags: RiskFlag[] = [];
  for (const item of obj.risk_flags) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    const sev =
      typeof rec.severity === "string"
        ? (rec.severity.toLowerCase() as RiskSeverity)
        : null;
    if (!sev || !RISK_SEVERITIES.has(sev)) return null;
    if (typeof rec.clause !== "string" || typeof rec.why_it_matters !== "string") {
      return null;
    }
    riskFlags.push({
      severity: sev,
      clause: rec.clause,
      why_it_matters: rec.why_it_matters,
    });
  }

  const actionChecklist: ActionItem[] = [];
  for (const item of obj.action_checklist) {
    if (!item || typeof item !== "object") return null;
    const rec = item as Record<string, unknown>;
    const pri =
      typeof rec.priority === "string"
        ? (rec.priority.toLowerCase() as ActionPriority)
        : null;
    if (!pri || !ACTION_PRIORITIES.has(pri)) return null;
    if (typeof rec.step !== "string") return null;
    if (
      rec.deadline !== null &&
      rec.deadline !== undefined &&
      typeof rec.deadline !== "string"
    ) {
      return null;
    }
    actionChecklist.push({
      step: rec.step,
      deadline: rec.deadline ?? null,
      priority: pri,
    });
  }

  const questionsToAsk: string[] = [];
  for (const q of obj.questions_to_ask) {
    if (typeof q !== "string") return null;
    questionsToAsk.push(q);
  }

  return {
    document_type: obj.document_type,
    is_readable: obj.is_readable,
    unreadable_reason: obj.unreadable_reason ?? null,
    attention_level: attentionLevel,
    attention_reason: obj.attention_reason,
    summary: obj.summary,
    key_facts: keyFacts,
    risk_flags: riskFlags,
    action_checklist: actionChecklist,
    questions_to_ask: questionsToAsk,
    document_context: obj.document_context,
  };
}

export function validateChatRequest(body: unknown): ChatApiRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Invalid request body.", 400, "INVALID_REQUEST");
  }

  const raw = body as Record<string, unknown>;
  const question = sanitizeText(raw.question);
  if (!question) {
    throw new AppError("Please enter a question about your document.", 400, "MISSING_QUESTION");
  }
  if (question.length > MAX_CHAT_QUESTION_LENGTH) {
    throw new AppError(
      `Question is too long (maximum ${MAX_CHAT_QUESTION_LENGTH} characters).`,
      400,
      "QUESTION_TOO_LONG"
    );
  }

  if (!isSupportedLanguage(raw.language)) {
    throw new AppError("Unsupported language selected.", 400, "INVALID_LANGUAGE");
  }

  const documentContext = sanitizeText(raw.documentContext);
  if (!documentContext) {
    throw new AppError(
      "Document context is missing. Please analyze a document first.",
      400,
      "MISSING_DOCUMENT_CONTEXT"
    );
  }

  const analysisRaw = raw.analysis;
  if (!analysisRaw || typeof analysisRaw !== "object" || Array.isArray(analysisRaw)) {
    throw new AppError("Document analysis summary is missing.", 400, "MISSING_ANALYSIS");
  }

  const historyRaw = Array.isArray(raw.history) ? raw.history : [];
  const history: ChatMessage[] = historyRaw
    .slice(-MAX_CHAT_HISTORY_TURNS)
    .filter(
      (msg): msg is Record<string, unknown> =>
        Boolean(msg && typeof msg === "object" && !Array.isArray(msg))
    )
    .map((msg) => ({
      role: (msg.role === "assistant" ? "assistant" : "user") as ChatMessage["role"],
      content: sanitizeText(msg.content),
    }))
    .filter((msg) => msg.content.length > 0);

  return {
    question,
    language: raw.language,
    documentContext,
    analysis: analysisRaw as ClientDocumentAnalysis,
    history,
  };
}
