export type SupportedLanguage =
  | "English"
  | "Hindi"
  | "Bengali"
  | "Tamil"
  | "Telugu"
  | "Marathi"
  | "Gujarati"
  | "Kannada"
  | "Malayalam"
  | "Punjabi";

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
  speechLang: string;
}

export type AllowedMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export type AttentionLevel = "low" | "medium" | "high";
export type RiskSeverity = "low" | "medium" | "high";
export type ActionPriority = "urgent" | "soon" | "later";

export interface KeyFact {
  label: string;
  value: string;
}

export interface RiskFlag {
  severity: RiskSeverity;
  clause: string;
  why_it_matters: string;
}

export interface ActionItem {
  step: string;
  deadline: string | null;
  priority: ActionPriority;
}

export interface DocumentAnalysis {
  document_type: string;
  is_readable: boolean;
  unreadable_reason: string | null;
  attention_level: AttentionLevel;
  attention_reason: string;
  summary: string;
  key_facts: KeyFact[];
  risk_flags: RiskFlag[];
  action_checklist: ActionItem[];
  questions_to_ask: string[];
  document_context: string;
}

export type ClientDocumentAnalysis = Omit<DocumentAnalysis, "document_context">;

export interface AnalyzeApiResponse {
  analysis: ClientDocumentAnalysis;
  documentContext: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiRequest {
  question: string;
  language: SupportedLanguage;
  documentContext: string;
  analysis: ClientDocumentAnalysis;
  history: ChatMessage[];
}

export interface ChatApiResponse {
  answer: string;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  retryAfterSeconds?: number;
}
