"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2 } from "lucide-react";
import type { SupportedLanguage } from "@/types/document";

interface LoadingStateProps {
  language: SupportedLanguage;
  fileName?: string;
  previewUrl?: string | null;
}

export function LoadingState({ language, fileName, previewUrl }: LoadingStateProps) {
  const steps = [
    "Reading text, tables, stamps & handwritten notes",
    "Extracting key dates, amounts & deadlines",
    "Checking for lock-ins, penalties & risky clauses",
    `Writing simple explanation in ${language}`,
  ];

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => clearInterval(timer);
  }, [steps.length]);

  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 90);

  return (
    <section
      role="status"
      aria-live="polite"
      className="mx-auto max-w-2xl animate-fade-in-up rounded-3xl border border-sky-200 bg-white p-6 shadow-md sm:p-8"
    >
      <div className="flex flex-col items-center text-center">
        {previewUrl ? (
          <div className="relative mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Document being analyzed"
              className="h-24 w-20 rounded-xl border border-sky-200 object-cover shadow-sm opacity-90"
            />
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-700 text-white shadow">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-100">
            <FileText className="h-8 w-8 animate-pulse" aria-hidden="true" />
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Analyzing your document...
        </h2>
        {fileName ? (
          <p className="mt-1 max-w-xs truncate text-sm text-slate-500">{fileName}</p>
        ) : null}

        {/* Smooth progress bar */}
        <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-teal-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step-by-step live status */}
      <ul className="mt-6 space-y-3">
        {steps.map((label, idx) => {
          const isCompleted = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all ${
                isCurrent
                  ? "border-sky-300 bg-sky-50/80 font-semibold text-sky-950"
                  : isCompleted
                  ? "border-teal-200 bg-teal-50/50 text-teal-900"
                  : "border-slate-100 bg-slate-50/50 text-slate-400"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-teal-600 text-white"
                    : isCurrent
                    ? "bg-sky-700 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-center text-xs text-slate-500">
        Usually takes 5–15 seconds. Your file is never stored on disk.
      </p>
    </section>
  );
}
