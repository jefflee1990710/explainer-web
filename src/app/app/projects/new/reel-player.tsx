"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import { ASPECT_CLASS } from "@/components/project/frame-tile";
import type { AspectRatio } from "@/types/project";

// Single-file reel preview + download. Blob URLs are cross-origin, so we
// fetch then save rather than relying on the download attribute.
export function ReelPlayer({
  src,
  aspectRatio,
  filename,
}: {
  src: string;
  aspectRatio: AspectRatio;
  filename: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onDownload() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("下載失敗，請再試一次");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "下載失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`mx-auto w-full overflow-hidden rounded-2xl bg-black ${
          aspectRatio === "9:16" ? "max-w-[22rem]" : "max-w-3xl"
        } ${ASPECT_CLASS[aspectRatio]}`}
      >
        <video key={src} className="h-full w-full object-contain" src={src} controls autoPlay />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={() => void onDownload()}
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Spinner /> : null}
          {saving ? "準備檔案…" : "下載成片"}
        </motion.button>
      </div>
      {error ? (
        <p role="alert" className="text-center text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
