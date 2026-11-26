"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  Languages,
  Sparkles,
  UploadCloud,
  X,
  ZoomIn,
} from "lucide-react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  SAMPLE_DOCUMENTS,
  SUPPORTED_LANGUAGES,
  type SampleDocumentInfo,
} from "@/lib/constants";
import type { SupportedLanguage } from "@/types/document";

interface UploadPanelProps {
  selectedFile: File | null;
  previewUrl: string | null;
  language: SupportedLanguage;
  disabled: boolean;
  loadingSampleId: string | null;
  onLanguageChange: (language: SupportedLanguage) => void;
  onFileSelect: (file: File | null) => void;
  onValidationError: (message: string) => void;
  onAnalyze: () => void;
  onTrySample: (sample: SampleDocumentInfo) => void;
}

const QUICK_LANGUAGES: SupportedLanguage[] = [
  "English",
  "Hindi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadPanel({
  selectedFile,
  previewUrl,
  language,
  disabled,
  loadingSampleId,
  onLanguageChange,
  onFileSelect,
  onValidationError,
  onAnalyze,
  onTrySample,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    if (!showZoomModal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowZoomModal(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showZoomModal]);

  function validateAndPickFile(file: File | undefined) {
    if (!file) return;

    const mime = file.type.toLowerCase();
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      onValidationError(
        "Unsupported file type. Please choose a JPG, PNG, WebP image, or a PDF file."
      );
      return;
    }

    if (file.size === 0) {
      onValidationError("That file appears to be empty. Please choose another file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onValidationError(
        `This file is ${formatBytes(file.size)}, which is over the ${MAX_FILE_SIZE_LABEL} limit. Please upload a smaller photo or PDF.`
      );
      return;
    }

    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    validateAndPickFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up space-y-6">
      {/* Compact Hero Intro Banner */}
      <section className="rounded-3xl border border-sky-700/20 bg-gradient-to-br from-sky-900 via-sky-800 to-teal-800 p-5 text-white shadow-md dark:border-sky-500/20 dark:from-sky-950 dark:via-slate-900 dark:to-teal-950 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Don&apos;t sign or ignore papers you can&apos;t read.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sky-100 sm:text-base">
              Upload any rent agreement, bank notice, utility bill, medical report, or government letter.
              Get simple everyday explanations, hidden risk alerts, and next steps in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
            {["Rent & Leases", "Bank & Loan Notices", "Bills & Fines", "Medical Reports"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Main Upload & Language Card */}
      <section
        aria-labelledby="upload-heading"
        className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 shadow-md backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/95 sm:p-7"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 id="upload-heading" className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
              Upload Document &amp; Pick Language
            </h3>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              JPG, PNG, WebP, or PDF up to {MAX_FILE_SIZE_LABEL}
            </p>
          </div>
          {selectedFile ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Ready
            </span>
          ) : null}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          aria-label="Choose a document image or PDF"
          disabled={disabled}
          onChange={(e) => {
            validateAndPickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Take a photo of your document using camera"
          disabled={disabled}
          onChange={(e) => {
            validateAndPickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all sm:py-10 ${
              isDragging
                ? "scale-[1.01] border-sky-500 bg-sky-50 shadow-inner dark:bg-sky-950/40"
                : "border-sky-200 bg-sky-50/40 hover:border-sky-400 hover:bg-sky-50/70 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-sky-500 dark:hover:bg-slate-800"
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                isDragging
                  ? "bg-sky-600 text-white"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
              }`}
            >
              <UploadCloud className="h-7 w-7" aria-hidden="true" />
            </div>

            <p className="mt-3.5 text-base font-semibold text-slate-900 dark:text-white">
              Drag and drop your file here
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              or use the buttons below to browse or take a photo
            </p>

            <div className="mt-5 flex w-full max-w-sm flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Choose File / PDF
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowCameraModal(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Take Photo
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 transition-all dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3.5">
                {previewUrl && selectedFile.type.startsWith("image/") ? (
                  <button
                    type="button"
                    onClick={() => setShowZoomModal(true)}
                    className="group relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-600 dark:border-slate-700"
                    aria-label="Zoom in to preview uploaded document"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`Preview of ${selectedFile.name}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-900/70 py-0.5 text-[10px] font-semibold text-white">
                      <ZoomIn className="h-3 w-3" aria-hidden="true" />
                      Zoom
                    </span>
                  </button>
                ) : (
                  <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    <FileText className="h-8 w-8" aria-hidden="true" />
                    <span className="mt-1 text-xs font-bold uppercase">PDF</span>
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                    {formatBytes(selectedFile.size)} &bull;{" "}
                    {selectedFile.type === "application/pdf" ? "PDF Document" : "Image"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded text-xs font-semibold text-sky-700 underline hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-600 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      Replace file
                    </button>
                    {previewUrl ? (
                      <button
                        type="button"
                        onClick={() => setShowZoomModal(true)}
                        className="inline-flex items-center gap-1 rounded text-xs font-semibold text-teal-700 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Inspect full image
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onFileSelect(null)}
                aria-label="Remove selected file"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Language Selection: Quick Tap Chips + Full Dropdown */}
        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="output-language"
              className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"
            >
              <Languages className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden="true" />
              Select Output Language
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">10 languages supported</span>
          </div>

          <div
            className="mt-2.5 flex flex-wrap gap-2"
            role="group"
            aria-label="Quick language choices"
          >
            {QUICK_LANGUAGES.map((langValue) => {
              const option = SUPPORTED_LANGUAGES.find((l) => l.value === langValue);
              if (!option) return null;
              const active = language === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onLanguageChange(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-600 sm:text-sm ${
                    active
                      ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                  }`}
                >
                  {option.nativeLabel !== option.label
                    ? `${option.nativeLabel} (${option.label})`
                    : option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <select
              id="output-language"
              value={language}
              disabled={disabled}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:text-base"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                  {lang.nativeLabel !== lang.label ? ` (${lang.nativeLabel})` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedFile || disabled}
              onClick={onAnalyze}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-700 to-teal-700 px-6 py-3 text-base font-bold text-white shadow-sm transition hover:from-sky-800 hover:to-teal-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900 sm:w-auto"
            >
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Explain Document
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Subtle Try a sample row */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Try a sample:
            </span>
            {SAMPLE_DOCUMENTS.map((sample) => {
              const isLoadingThis = loadingSampleId === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTrySample(sample)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 text-sky-700 dark:text-sky-400" aria-hidden="true" />
                  {isLoadingThis ? `Loading ${sample.title}...` : sample.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(file) => validateAndPickFile(file)}
        onFallbackFilePicker={() => cameraInputRef.current?.click()}
      />

      {/* Image Zoom Lightbox Modal */}
      {showZoomModal && previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setShowZoomModal(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-auto rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowZoomModal(false)}
              aria-label="Close document preview"
              className="sticky top-2 float-right z-10 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Full size preview of uploaded document"
              className="h-auto max-w-full rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
