"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackFilePicker: () => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackFilePicker,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeSessionRef = useRef(0);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      const sessionId = ++activeSessionRef.current;
      stopStream();
      setStatus("starting");
      setErrorMessage("");
      setCapturedPreview(null);
      setCapturedBlob(null);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setStatus("error");
        setErrorMessage(
          "Live camera preview is only supported on HTTPS or localhost. You can still upload a photo from your device."
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // Fallback to default camera if facingMode constraint isn't supported
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (activeSessionRef.current !== sessionId) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
      } catch (err) {
        if (activeSessionRef.current !== sessionId) return;
        setStatus("error");
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErrorMessage(
            "Camera permission was blocked. Please allow camera access in your browser address bar, or choose a photo from your device."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErrorMessage(
            "No camera was detected on this device. You can choose an image or PDF file instead."
          );
        } else {
          setErrorMessage(
            "Could not start the camera right now. Please try choosing a photo from your device."
          );
        }
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!isOpen) {
      activeSessionRef.current += 1;
      stopStream();
      setCapturedPreview(null);
      setCapturedBlob(null);
      return;
    }

    void startCamera(facingMode);
    return () => {
      activeSessionRef.current += 1;
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSnap() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(url);
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  }

  function handleRetake() {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    void startCamera(facingMode);
  }

  function handleUsePhoto() {
    if (!capturedBlob) return;
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    const file = new File([capturedBlob], `document-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopStream();
    onCapture(file);
    onClose();
  }

  function handleClose() {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    stopStream();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo of your document"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-sky-700" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900">
              Take a Document Photo
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-slate-900">
          {capturedPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedPreview}
              alt="Captured document preview"
              className="max-h-[60vh] w-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`max-h-[60vh] w-full object-contain ${
                status === "ready" ? "block" : "hidden"
              }`}
            />
          )}

          {/* Alignment guide when live */}
          {status === "ready" && !capturedPreview ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-sky-300/70"
            />
          ) : null}

          {status === "starting" && !capturedPreview ? (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center text-slate-200">
              <Camera className="h-10 w-10 animate-pulse text-sky-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">Starting camera...</p>
              <p className="mt-1 text-xs text-slate-400">
                Allow camera access if your browser asks.
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="flex min-h-[16rem] flex-col items-center justify-center bg-slate-50 px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-slate-800">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onFallbackFilePicker();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Choose Photo from Device
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer Controls */}
        {status !== "error" ? (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 bg-white px-5 py-4">
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleUsePhoto}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600"
                >
                  Use This Photo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) =>
                      prev === "environment" ? "user" : "environment"
                    )
                  }
                  disabled={status !== "ready"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:opacity-50 sm:text-sm"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Switch Camera
                </button>

                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={status !== "ready"}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Capture Photo
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
