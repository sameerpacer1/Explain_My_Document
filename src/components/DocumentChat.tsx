"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";
import type {
  ApiErrorResponse,
  ChatApiResponse,
  ChatMessage,
  ClientDocumentAnalysis,
  SupportedLanguage,
} from "@/types/document";

interface DocumentChatProps {
  language: SupportedLanguage;
  documentContext: string;
  analysis: ClientDocumentAnalysis;
}

const STARTER_QUESTIONS = [
  "What happens if I miss a payment or deadline?",
  "Can I cancel or exit early, and what will it cost?",
  "Are there any extra or hidden charges mentioned?",
  "Who should I contact if I disagree with something here?",
];

export function DocumentChat({
  language,
  documentContext,
  analysis,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function sendQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const nextHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextHistory);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          language,
          documentContext,
          analysis,
          history: messages,
        }),
      });

      const rawText = await response.text();
      let data: ChatApiResponse | ApiErrorResponse | null = null;
      try {
        data = JSON.parse(rawText) as ChatApiResponse | ApiErrorResponse;
      } catch {
        data = null;
      }

      if (!response.ok || !data || !("answer" in data)) {
        let errMsg = "Could not answer right now. Please try again.";
        if (data && "error" in data && data.error) {
          errMsg = data.error;
        } else if (response.status === 504) {
          errMsg = "The answer took too long. Please try asking again.";
        }
        setError(errMsg);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch {
      setError("Network error while sending your question. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendQuestion(input);
  }

  return (
    <section
      id="chat-section"
      aria-labelledby="chat-heading"
      className="flex flex-col rounded-3xl border border-sky-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 no-print sm:p-6 lg:sticky lg:top-28"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-600 text-white shadow-sm">
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 id="chat-heading" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            Ask About This Document
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            Grounded only in your document &bull; Replies in {language}
          </p>
        </div>
      </div>

      {/* Starter Chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={isLoading}
            onClick={() => void sendQuestion(q)}
            className="rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1.5 text-left text-xs font-medium text-sky-900 transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-200 dark:hover:bg-slate-700"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className="mt-4 max-h-80 min-h-[140px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 lg:max-h-[400px]"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-28 flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Tap a quick question above or type your own below.
            </p>
            <p className="mt-1">
              If something isn&apos;t in the document, I&apos;ll tell you clearly.
            </p>
          </div>
        ) : null}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm bg-sky-700 text-white shadow-sm"
                  : "rounded-bl-sm border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-sky-700 dark:text-sky-400" aria-hidden="true" />
              Checking your document...
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 sm:text-sm"
        >
          {error}
        </div>
      ) : null}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3.5 flex gap-2">
        <label htmlFor="chat-question-input" className="sr-only">
          Ask a question about this document
        </label>
        <input
          id="chat-question-input"
          type="text"
          value={input}
          disabled={isLoading}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this document..."
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send question"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </section>
  );
}
