import type { ClientDocumentAnalysis, DocumentAnalysis } from "@/types/document";

/**
 * Removes potentially unsafe HTML tags, script payloads, and non-printable
 * control characters from model-generated text before storage or rendering.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    // Strip ASCII control characters except tab, newline, carriage return
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Strip HTML/XML-like tags to guarantee plain text output
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Truncates text cleanly to a maximum number of whitespace-delimited words.
 */
export function truncateWords(text: string, maxWords: number): string {
  const cleaned = sanitizeText(text);
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

/**
 * Sanitizes every string field in a validated DocumentAnalysis object.
 */
export function sanitizeDocumentAnalysis(
  raw: DocumentAnalysis,
  maxContextWords: number
): { analysis: ClientDocumentAnalysis; documentContext: string } {
  const analysis: ClientDocumentAnalysis = {
    document_type: sanitizeText(raw.document_type) || "Document",
    is_readable: Boolean(raw.is_readable),
    unreadable_reason: raw.unreadable_reason
      ? sanitizeText(raw.unreadable_reason)
      : null,
    attention_level: raw.attention_level,
    attention_reason: sanitizeText(raw.attention_reason),
    summary: sanitizeText(raw.summary),
    key_facts: Array.isArray(raw.key_facts)
      ? raw.key_facts
          .map((item) => ({
            label: sanitizeText(item.label),
            value: sanitizeText(item.value),
          }))
          .filter((item) => item.label.length > 0 && item.value.length > 0)
      : [],
    risk_flags: Array.isArray(raw.risk_flags)
      ? raw.risk_flags
          .map((flag) => ({
            severity: flag.severity,
            clause: sanitizeText(flag.clause),
            why_it_matters: sanitizeText(flag.why_it_matters),
          }))
          .filter((flag) => flag.clause.length > 0 || flag.why_it_matters.length > 0)
      : [],
    action_checklist: Array.isArray(raw.action_checklist)
      ? raw.action_checklist
          .map((item) => ({
            step: sanitizeText(item.step),
            deadline: item.deadline ? sanitizeText(item.deadline) : null,
            priority: item.priority,
          }))
          .filter((item) => item.step.length > 0)
      : [],
    questions_to_ask: Array.isArray(raw.questions_to_ask)
      ? raw.questions_to_ask.map((q) => sanitizeText(q)).filter(Boolean)
      : [],
  };

  const documentContext = truncateWords(raw.document_context || "", maxContextWords);

  return { analysis, documentContext };
}
