"use client";

// Download control for a canvas preview. Fetches the file, then saves it locally.

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  canvasDownloadFilename,
  downloadCanvasFile,
  type CanvasDownloadKind,
} from "@/app/app/canvas/download-canvas-file";

export function CanvasDownloadButton({
  url,
  title,
  kind,
  className,
  children,
}: {
  url: string;
  title?: string;
  kind: CanvasDownloadKind;
  className: string;
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [saving, setSaving] = useState(false);
  const label = isZh ? "下載檔案" : "Download";

  return (
    <button
      type="button"
      disabled={saving}
      title={label}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (saving) return;
        setSaving(true);
        void downloadCanvasFile(url, canvasDownloadFilename(title, url, kind))
          .catch(() => {
            toast.error(isZh ? "下載失敗，請再試一次" : "Download failed. Try again.");
          })
          .finally(() => setSaving(false));
      }}
      className={`nodrag nopan cursor-pointer disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
