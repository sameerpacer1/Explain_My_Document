"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Eye,
  HelpCircle,
  Languages,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { APP_DISCLAIMER, SUPPORTED_LANGUAGES } from "@/lib/constants";
import type {
  ActionItem,
  ActionPriority,
  AttentionLevel,
  ClientDocumentAnalysis,
  RiskSeverity,
  SupportedLanguage,
} from "@/types/document";

interface ResultsDashboardProps {
  analysis: ClientDocumentAnalysis;
  language: SupportedLanguage;
  previewUrl: string | null;
  canReanalyze: boolean;
  isReanalyzing: boolean;
  onReanalyzeInLanguage: (newLanguage: SupportedLanguage) => void;
  onReset: () => void;
}

type SectionTab = "all" | "summary" | "risks" | "checklist" | "questions";

const ATTENTION_STYLES: Record<
  AttentionLevel,
  {
    badge: string;
    label: string;
    border: string;
    iconColor: string;
    meterWidth: string;
    meterColor: string;
  }
> = {
  low: {
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
    label: "Low Attention",
    border: "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white dark:border-emerald-800 dark:from-emerald-950/50 dark:to-slate-900",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    meterWidth: "w-1/3",
    meterColor: "bg-emerald-500",
  },
  medium: {
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
    label: "Medium Attention",
    border: "border-amber-200 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-800 dark:from-amber-950/50 dark:to-slate-900",
    iconColor: "text-amber-700 dark:text-amber-400",
    meterWidth: "w-2/3",
    meterColor: "bg-amber-500",
  },
  high: {
    badge: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
    label: "High Attention",
    border: "border-rose-200 bg-gradient-to-br from-rose-50/80 to-white dark:border-rose-800 dark:from-rose-950/50 dark:to-slate-900",
    iconColor: "text-rose-700 dark:text-rose-400",
    meterWidth: "w-full",
    meterColor: "bg-rose-600",
  },
};

const RISK_STYLES: Record<
  RiskSeverity,
  { card: string; badge: string; label: string }
> = {
  high: {
    card: "border-rose-200 bg-rose-50/60 dark:border-rose-800/80 dark:bg-rose-950/35",
    badge: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700",
    label: "High Risk",
  },
  medium: {
    card: "border-amber-200 bg-amber-50/60 dark:border-amber-800/80 dark:bg-amber-950/35",
    badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
    label: "Medium Risk",
  },
  low: {
    card: "border-sky-200 bg-sky-50/60 dark:border-sky-800/80 dark:bg-sky-950/35",
    badge: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-700",
    label: "Low Risk",
  },
};

const PRIORITY_META: Record<
  ActionPriority,
  { heading: string; pill: string }
> = {
  urgent: {
    heading: "Urgent (Do First)",
    pill: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  },
  soon: {
    heading: "Soon",
    pill: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  },
  later: {
    heading: "Later / Keep in Mind",
    pill: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  },
};

function buildPlainTextReport(analysis: ClientDocumentAnalysis): string {
  const lines: string[] = [
    `Document Type: ${analysis.document_type}`,
    `Attention Level: ${analysis.attention_level.toUpperCase()} — ${analysis.attention_reason}`,
    "",
    "SUMMARY:",
    analysis.summary,
  ];

  if (analysis.key_facts.length > 0) {
    lines.push("", "KEY FACTS:");
    for (const fact of analysis.key_facts) {
      lines.push(`- ${fact.label}: ${fact.value}`);
    }
  }

  if (analysis.risk_flags.length > 0) {
    lines.push("", "RISK FLAGS:");
    for (const risk of analysis.risk_flags) {
      lines.push(
        `- [${risk.severity.toUpperCase()}] ${risk.clause} — Why it matters: ${risk.why_it_matters}`
      );
    }
  }

  if (analysis.action_checklist.length > 0) {
    lines.push("", "ACTION CHECKLIST:");
    for (const item of analysis.action_checklist) {
      const deadlineNote = item.deadline ? ` (Deadline: ${item.deadline})` : "";
      lines.push(`- [${item.priority.toUpperCase()}] ${item.step}${deadlineNote}`);
    }
  }

  if (analysis.questions_to_ask.length > 0) {
    lines.push("", "QUESTIONS TO ASK:");
    analysis.questions_to_ask.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q}`);
    });
  }

  lines.push("", `Note: ${APP_DISCLAIMER}`);
  return lines.join("\n");
}

export function ResultsDashboard({
  analysis,
  language,
  previewUrl,
  canReanalyze,
  isReanalyzing,
  onReanalyzeInLanguage,
  onReset,
}: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<SectionTab>("all");
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  useEffect(() => {
    setCheckedSteps({});
    setSpeechNotice(null);
    setActiveTab("all");
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [analysis]);

  useEffect(() => {
    if (!showDocModal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDocModal(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDocModal]);

  function handleToggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechNotice("Voice playback is not supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    setSpeechNotice(null);
    synth.cancel();

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.value === language);
    const targetSpeechLang = langConfig?.speechLang ?? "en-IN";
    const textToRead = `${analysis.document_type}. ${analysis.attention_reason}. ${analysis.summary}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = targetSpeechLang;
    utterance.rate = 0.95;

    const voices = synth.getVoices();
    const langPrefix = targetSpeechLang.split("-")[0]?.toLowerCase() ?? "en";
    const exactVoice = voices.find(
      (v) => v.lang.toLowerCase() === targetSpeechLang.toLowerCase()
    );
    const partialVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );

    if (exactVoice) {
      utterance.voice = exactVoice;
    } else if (partialVoice) {
      utterance.voice = partialVoice;
    } else if (voices.length > 0 && language !== "English") {
      setSpeechNotice(
        `Your browser does not have a built-in ${language} voice installed, so playback may sound unclear.`
      );
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechNotice("Could not play audio on this device.");
    };

    setIsSpeaking(true);
    synth.speak(utterance);
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(buildPlainTextReport(analysis));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setSpeechNotice("Could not copy automatically. You can select and copy the text.");
    }
  }

  function handleDownloadPdf() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  // Unreadable document state
  if (!analysis.is_readable) {
    return (
      <section
        aria-live="polite"
        className="mx-auto max-w-2xl animate-fade-in-up rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 sm:p-8"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
            <Camera className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              We could not read this document clearly
            </h2>
            <p className="mt-2 text-base leading-relaxed text-slate-800 dark:text-slate-200">
              {analysis.unreadable_reason ||
                "The image looks blurry, cut off, or is not a readable document."}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-800/60 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Tips for a clearer photo:
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>Place the document flat on a well-lit table without shadows.</li>
            <li>Hold your phone directly above the page and wait for it to focus.</li>
            <li>Make sure all four corners and small text are inside the frame.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Upload Another Document
        </button>
      </section>
    );
  }

  const attention = ATTENTION_STYLES[analysis.attention_level];
  const totalSteps = analysis.action_checklist.length;
  const completedStepsCount = analysis.action_checklist.filter(
    (_, idx) => Boolean(checkedSteps[idx])
  ).length;
  const checklistPct =
    totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;

  const indexedChecklist = analysis.action_checklist.map((item, idx) => ({
    item,
    idx,
  }));
  const priorityOrder: ActionPriority[] = ["urgent", "soon", "later"];
  const groupedChecklist: Array<{
    priority: ActionPriority;
    items: Array<{ item: ActionItem; idx: number }>;
  }> = priorityOrder
    .map((priority) => ({
      priority,
      items: indexedChecklist.filter((entry) => entry.item.priority === priority),
    }))
    .filter((group) => group.items.length > 0);

  const tabs: Array<{ id: SectionTab; label: string }> = [
    { id: "all", label: "All" },
    { id: "summary", label: "Summary & Facts" },
    { id: "risks", label: `Risks (${analysis.risk_flags.length})` },
    { id: "checklist", label: `Checklist (${completedStepsCount}/${totalSteps})` },
    { id: "questions", label: `Questions (${analysis.questions_to_ask.length})` },
  ];

  const showSummary = activeTab === "all" || activeTab === "summary";
  const showRisks = activeTab === "all" || activeTab === "risks";
  const showChecklist = activeTab === "all" || activeTab === "checklist";
  const showQuestions = activeTab === "all" || activeTab === "questions";

  return (
    <div aria-live="polite" className="animate-fade-in-up space-y-5">
      {/* Print-only header */}
      <div className="mb-4 hidden border-b border-slate-300 pb-3 print-only">
        <h1 className="text-xl font-bold text-slate-900">
          Explain-My-Document — Summary Report ({language})
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Generated from user upload in memory. Not stored on any server.
        </p>
      </div>

      {/* Top Attention Level & Action Card */}
      <section className={`rounded-3xl border p-5 shadow-sm print-card sm:p-6 ${attention.border}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {analysis.document_type}
              </span>
              {previewUrl ? (
                <button
                  type="button"
                  onClick={() => setShowDocModal(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700 no-print"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  View Original
                </button>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">
              {analysis.attention_reason}
            </h2>
          </div>

          <div className="shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold shadow-sm ${attention.badge}`}
            >
              <AlertTriangle className={`h-4 w-4 ${attention.iconColor}`} aria-hidden="true" />
              {attention.label}
            </span>
          </div>
        </div>

        {/* Visual Attention Gauge */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${attention.meterWidth} ${attention.meterColor}`}
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-800 no-print">
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-600 sm:text-sm ${
              isSpeaking
                ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            {isSpeaking ? (
              <>
                <Square className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                Stop
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                Listen
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:text-sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                Copy
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:text-sm"
          >
            <Download className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
            Save PDF
          </button>

          {canReanalyze ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Languages className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              <label htmlFor="switch-language" className="sr-only">
                Switch output language
              </label>
              <select
                id="switch-language"
                value={language}
                disabled={isReanalyzing}
                onChange={(e) =>
                  onReanalyzeInLanguage(e.target.value as SupportedLanguage)
                }
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none disabled:opacity-50 dark:text-slate-100 sm:text-sm"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option
                    key={lang.value}
                    value={lang.value}
                    className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {lang.label}
                    {lang.nativeLabel !== lang.label ? ` (${lang.nativeLabel})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <a
            href="#chat-section"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200 lg:hidden"
          >
            <MessageSquare className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
            Ask AI
          </a>

          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 sm:text-sm"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Analyze another
          </button>
        </div>

        {speechNotice ? (
          <p className="mt-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 no-print">
            {speechNotice}
          </p>
        ) : null}
      </section>

      {/* Interactive Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter document explanation sections"
        className="flex gap-1.5 overflow-x-auto pb-1 no-print"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-600 sm:text-sm ${
                active
                  ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary + Key Facts */}
      {showSummary ? (
        <>
          <section
            aria-labelledby="summary-heading"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print-card sm:p-6"
          >
            <h3 id="summary-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              Plain-Language Summary
            </h3>
            <p className="mt-2.5 whitespace-pre-line text-base leading-relaxed text-slate-800 dark:text-slate-200 sm:text-lg">
              {analysis.summary}
            </p>
          </section>

          <section
            aria-labelledby="facts-heading"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print-card sm:p-6"
          >
            <h3 id="facts-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              Key Facts
            </h3>
            {analysis.key_facts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                No specific dates, amounts, or parties were clearly listed.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800 sm:text-base">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        Detail
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        What the document says
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {analysis.key_facts.map((fact, idx) => (
                      <tr key={`${fact.label}-${idx}`} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white sm:w-2/5">
                          {fact.label}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {fact.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* Risk Flags */}
      {showRisks ? (
        <section
          aria-labelledby="risks-heading"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print-card sm:p-6"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
              <h3 id="risks-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Risk Flags &amp; Things to Watch Out For
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {analysis.risk_flags.length}
            </span>
          </div>

          {analysis.risk_flags.length === 0 ? (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <p className="text-sm font-medium sm:text-base">
                No unusual, one-sided, or hidden risky clauses were spotted in this document.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {analysis.risk_flags.map((flag, idx) => {
                const style = RISK_STYLES[flag.severity];
                return (
                  <article
                    key={`${flag.severity}-${idx}`}
                    className={`rounded-2xl border p-4 transition hover:shadow-sm ${style.card}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                      &ldquo;{flag.clause}&rdquo;
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-300 sm:text-base">
                      <span className="font-semibold">Why it matters: </span>
                      {flag.why_it_matters}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Action Checklist */}
      {showChecklist ? (
        <section
          aria-labelledby="checklist-heading"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print-card sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              <h3 id="checklist-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                Action Checklist
              </h3>
            </div>
            {totalSteps > 0 ? (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 sm:text-sm">
                {completedStepsCount} of {totalSteps} done ({checklistPct}%)
              </span>
            ) : null}
          </div>

          {totalSteps > 0 ? (
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 no-print">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-300"
                style={{ width: `${checklistPct}%` }}
              />
            </div>
          ) : null}

          {groupedChecklist.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              No immediate action items found. Keep a copy of this document for your records.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {groupedChecklist.map((group) => {
                const meta = PRIORITY_META[group.priority];
                return (
                  <div key={group.priority}>
                    <span
                      className={`inline-block rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${meta.pill}`}
                    >
                      {meta.heading}
                    </span>
                    <ul className="mt-2.5 space-y-2.5">
                      {group.items.map(({ item, idx }) => {
                        const isDone = Boolean(checkedSteps[idx]);
                        return (
                          <li key={idx}>
                            <label
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                                isDone
                                  ? "border-teal-200 bg-teal-50/40 dark:border-teal-800 dark:bg-teal-950/30"
                                  : "border-slate-200 bg-slate-50/70 hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-sky-600 dark:hover:bg-slate-800"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() =>
                                  setCheckedSteps((prev) => ({
                                    ...prev,
                                    [idx]: !prev[idx],
                                  }))
                                }
                                className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-700 focus:ring-sky-600 dark:border-slate-600"
                              />
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`block text-sm leading-relaxed sm:text-base ${
                                    isDone
                                      ? "line-through text-slate-400 dark:text-slate-500"
                                      : "font-medium text-slate-900 dark:text-slate-100"
                                  }`}
                                >
                                  {item.step}
                                </span>
                                {item.deadline ? (
                                  <span className="mt-1.5 inline-block rounded-md border border-rose-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
                                    Deadline: {item.deadline}
                                  </span>
                                ) : null}
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Questions to Ask */}
      {showQuestions ? (
        <section
          aria-labelledby="questions-heading"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print-card sm:p-6"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <h3 id="questions-heading" className="text-lg font-bold text-slate-900 dark:text-white">
              Questions You Should Ask
            </h3>
          </div>
          {analysis.questions_to_ask.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              No follow-up questions generated for this document.
            </p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {analysis.questions_to_ask.map((question, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 sm:text-base"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900 dark:bg-teal-950 dark:text-teal-200">
                    {idx + 1}
                  </span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {/* Original Document Preview Modal */}
      {showDocModal && previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Original uploaded document"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm no-print"
          onClick={() => setShowDocModal(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-auto rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDocModal(false)}
              aria-label="Close document preview"
              className="sticky top-2 float-right z-10 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Uploaded document preview"
              className="h-auto max-w-full rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
