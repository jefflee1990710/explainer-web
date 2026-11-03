"use client";

import { useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { checkBrandUpload, resolveBrandContentType } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

const MULTIPART_FROM_BYTES = 8 * 1024 * 1024;

/**
 * Interactive dashed upload area supporting both click-to-browse and drag-and-drop direct Blob upload.
 */
export function BrandUploadDropzone({
  accept,
  disabled = false,
  externalProgress = null,
  hintText,
  subHintText,
  className = "h-28",
  onUploaded,
  onError,
  onProgress,
}: {
  accept: string;
  disabled?: boolean;
  externalProgress?: number | null;
  hintText: string;
  subHintText?: string;
  className?: string;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onError: (message: string) => void;
  onProgress?: (percent: number | null) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [internalProgress, setInternalProgress] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const activeProgress = internalProgress ?? externalProgress;
  const isBusy = disabled || uploading || activeProgress != null;

  function reportProgress(percent: number | null) {
    setInternalProgress(percent);
    onProgress?.(percent);
  }

  async function processFile(file: File | undefined) {
    if (!file || isBusy) return;
    const contentType = resolveBrandContentType(file);
    const allowGif = accept.includes("image/gif");
    const checked = checkBrandUpload({ type: contentType, size: file.size }, { allowGif });
    if (!checked.ok) {
      onError(translateAppError(checked.error, t));
      return;
    }

    setUploading(true);
    reportProgress(0);
    try {
      const prepared = await prepareBrandUploadAction({
        contentType,
        size: file.size,
        allowGif,
      });
      if (!prepared.ok) {
        onError(translateAppError(prepared.error, t));
        return;
      }
      const blob = await put(prepared.pathname, file, {
        access: "public",
        token: prepared.token,
        contentType: prepared.contentType,
        multipart: file.size > MULTIPART_FROM_BYTES,
        onUploadProgress: ({ percentage }) =>
          reportProgress(Math.min(100, Math.round(percentage))),
      });
      onUploaded({ url: blob.url, kind: prepared.kind });
    } catch (error) {
      console.error("[brand-upload-dropzone] direct upload failed", error);
      onError(t("errors.uploadFailed"));
    } finally {
      setUploading(false);
      reportProgress(null);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!isBusy) setIsDraggingOver(true);
        }}
        onDragOver={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!isBusy) setIsDraggingOver(true);
        }}
        onDragLeave={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setIsDraggingOver(false);
        }}
        onDrop={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setIsDraggingOver(false);
          if (isBusy) return;
          const file = ev.dataTransfer?.files?.[0];
          void processFile(file);
        }}
        className={`group flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
          isDraggingOver
            ? "border-accent-ink bg-lime/25 text-accent-ink"
            : "border-accent-ink/20 bg-paper/50 text-muted hover:border-accent-ink/50 hover:bg-paper/80 hover:text-foreground"
        } ${className}`}
      >
        {activeProgress != null ? (
          <span className="inline-flex items-center gap-2 font-semibold text-accent-ink">
            <Spinner className="h-4 w-4" />
            {activeProgress > 0
              ? t("video.upload.progress", { percent: activeProgress })
              : t("video.upload.uploading")}
          </span>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-accent-ink/60 transition group-hover:-translate-y-0.5 group-hover:text-accent-ink"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 19h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold">{hintText}</span>
            {subHintText ? (
              <span className="text-[11px] text-muted">{subHintText}</span>
            ) : null}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          void processFile(file);
        }}
      />
    </>
  );
}
