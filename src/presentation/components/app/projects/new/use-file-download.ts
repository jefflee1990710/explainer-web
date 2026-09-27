"use client";

import { useState } from "react";

// Blob URLs are cross-origin, so fetch then save instead of <a download>.
export function useFileDownload() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function download(src: string, filename: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("下載失敗，請再試一次");
      const href = URL.createObjectURL(await response.blob());
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

  return { saving, error, download };
}
