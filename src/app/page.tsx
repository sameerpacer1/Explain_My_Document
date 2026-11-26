"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { DocumentChat } from "@/components/DocumentChat";
import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import { HeroHeader } from "@/components/HeroHeader";
import { LoadingState } from "@/components/LoadingState";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { UploadPanel } from "@/components/UploadPanel";
import type { SampleDocumentInfo } from "@/lib/constants";
import { compressImageForUpload } from "@/lib/imageCompression";
import type {
  AnalyzeApiResponse,
  ApiErrorResponse,
  ClientDocumentAnalysis,
  SupportedLanguage,
} from "@/types/document";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>("English");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ClientDocumentAnalysis | null>(null);
  const [documentContext, setDocumentContext] = useState<string>("");

  // Manage object URL lifecycle safely in memory
  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  function handleFileSelect(file: File | null) {
    setErrorMessage(null);
    setSelectedFile(file);
  }

  async function runAnalysis(fileToAnalyze: File, targetLanguage: SupportedLanguage) {
    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const preparedFile = await compressImageForUpload(fileToAnalyze);
      const formData = new FormData();
      formData.append("file", preparedFile);
      formData.append("language", targetLanguage);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let data: AnalyzeApiResponse | ApiErrorResponse | null = null;
      try {
        data = JSON.parse(rawText) as AnalyzeApiResponse | ApiErrorResponse;
      } catch {
        data = null;
      }

      if (!response.ok || !data || !("analysis" in data)) {
        let msg = "We could not analyze this document right now. Please try again.";
        if (data && "error" in data && data.error) {
          msg = data.error;
        } else if (response.status === 413) {
          msg = "This file is too large for the server. Please upload a smaller image or PDF (under 4.5 MB).";
        } else if (response.status === 504) {
          msg = "Analyzing this document took too long. Please try a clearer or smaller photo and try again.";
        } else if (!response.ok) {
          msg = `Server error (${response.status}). Please try again in a moment.`;
        }
        setErrorMessage(msg);
        return;
      }

      setAnalysis(data.analysis);
      setDocumentContext(data.documentContext);
    } catch {
      setErrorMessage(
        "Network error while uploading your document. Please check your internet connection and try again."
      );
    } finally {
      setIsAnalyzing(false);
      setLoadingSampleId(null);
    }
  }

  function handleAnalyzeClick() {
    if (!selectedFile) {
      setErrorMessage("Please upload a photo or PDF of your document first.");
      return;
    }
    void runAnalysis(selectedFile, language);
  }

  async function handleTrySample(sample: SampleDocumentInfo) {
    setErrorMessage(null);
    setLoadingSampleId(sample.id);

    try {
      const res = await fetch(sample.filePath);
      if (!res.ok) {
        throw new Error("Could not load sample file");
      }
      const blob = await res.blob();
      const sampleFile = new File([blob], sample.fileName, {
        type: sample.mimeType,
      });
      setSelectedFile(sampleFile);
      await runAnalysis(sampleFile, language);
    } catch {
      setLoadingSampleId(null);
      setErrorMessage("Could not load the sample document. Please try uploading your own file.");
    }
  }

  function handleReanalyzeInLanguage(newLanguage: SupportedLanguage) {
    setLanguage(newLanguage);
    if (!selectedFile) return;
    void runAnalysis(selectedFile, newLanguage);
  }

  function handleReset() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAnalysis(null);
    setDocumentContext("");
    setSelectedFile(null);
    setErrorMessage(null);
  }

  const currentStep: 1 | 2 | 3 = analysis
    ? 3
    : selectedFile
    ? 2
    : 1;

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader
        currentStep={currentStep}
        hasResults={Boolean(analysis)}
        onReset={handleReset}
      />

      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-sm dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-200 no-print"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" />
            <div className="text-sm font-medium leading-relaxed sm:text-base">
              {errorMessage}
            </div>
          </div>
        ) : null}

        {isAnalyzing ? (
          <LoadingState
            language={language}
            fileName={selectedFile?.name}
            previewUrl={previewUrl}
          />
        ) : analysis ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className={analysis.is_readable ? "lg:col-span-7" : "lg:col-span-12"}>
              <ResultsDashboard
                analysis={analysis}
                language={language}
                previewUrl={previewUrl}
                canReanalyze={Boolean(selectedFile)}
                isReanalyzing={isAnalyzing}
                onReanalyzeInLanguage={handleReanalyzeInLanguage}
                onReset={handleReset}
              />
            </div>

            {analysis.is_readable ? (
              <div className="lg:col-span-5">
                <DocumentChat
                  key={`${language}-${analysis.document_type}`}
                  language={language}
                  documentContext={documentContext}
                  analysis={analysis}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <UploadPanel
            selectedFile={selectedFile}
            previewUrl={previewUrl}
            language={language}
            disabled={isAnalyzing || loadingSampleId !== null}
            loadingSampleId={loadingSampleId}
            onLanguageChange={setLanguage}
            onFileSelect={handleFileSelect}
            onValidationError={setErrorMessage}
            onAnalyze={handleAnalyzeClick}
            onTrySample={(sample) => void handleTrySample(sample)}
          />
        )}
      </main>

      <FooterDisclaimer />
    </div>
  );
}
