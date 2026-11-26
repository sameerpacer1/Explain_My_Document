import { FileText, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeroHeaderProps {
  currentStep: 1 | 2 | 3;
  hasResults: boolean;
  onReset?: () => void;
}

export function HeroHeader({ currentStep, hasResults, onReset }: HeroHeaderProps) {
  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Language" },
    { num: 3, label: "Explain & Ask" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-sky-100/90 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90 no-print">
      <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-600 text-white shadow-sm sm:h-11 sm:w-11"
              aria-hidden="true"
            >
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  Explain-My-Document
                </h1>
                <span className="hidden items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-200 sm:inline-flex">
                  <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  10 Indian Languages
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                Plain-language summaries, risk flags &amp; Q&amp;A for official documents
              </p>
            </div>
          </div>

          {/* Right side: Privacy Pill + Theme Toggle + Reset */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/90 px-3 py-1 text-xs font-medium text-teal-900 dark:border-teal-800 dark:bg-teal-950/70 dark:text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span className="hidden md:inline">Your document is processed in memory and never stored</span>
              <span className="md:hidden">Never stored</span>
            </div>

            <ThemeToggle />

            {hasResults && onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-1"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">New Document</span>
                <span className="sm:hidden">New</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Interactive Progress Stepper */}
        <nav aria-label="Progress" className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800 sm:gap-3">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            return (
              <div key={step.num} className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-sky-700 text-white shadow-sm"
                      : isDone
                      ? "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isDone
                        ? "bg-teal-600 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {step.num}
                  </span>
                  <span>{step.label}</span>
                </div>
                {idx < steps.length - 1 ? (
                  <div
                    className={`h-0.5 w-4 rounded sm:w-8 ${
                      isDone ? "bg-teal-400 dark:bg-teal-600" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
