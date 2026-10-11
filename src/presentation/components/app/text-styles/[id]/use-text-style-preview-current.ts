"use client";

import { useEffect, useState } from "react";
import { customTextStylePreviewPrompt } from "@/service/director/subtitle-look";
import { previewIsCurrent } from "@/service/style/preview-prompt";

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// True while the draft lookLine matches the sample already stored.
export function useTextStylePreviewCurrent(previewHash: string | undefined, lookLine: string) {
  const [draftHash, setDraftHash] = useState<string>();
  const prompt = customTextStylePreviewPrompt(lookLine);

  useEffect(() => {
    let cancelled = false;
    void sha256Hex(prompt).then((hash) => {
      if (!cancelled) setDraftHash(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [prompt]);

  if (previewHash && !draftHash) return true;
  return previewIsCurrent(previewHash, draftHash);
}
