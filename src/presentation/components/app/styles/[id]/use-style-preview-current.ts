"use client";

import { useEffect, useState } from "react";
import { previewIsCurrent, stylePreviewPrompt } from "@/service/style/preview-prompt";
import type { UserStyleFields } from "@/service/style/user-style-fields";

// Same digest Node stores in previewHash when a still finishes.
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// True while the draft's still prompt matches the preview already stored.
export function useStylePreviewCurrent(previewHash: string | undefined, draft: UserStyleFields) {
  const [draftHash, setDraftHash] = useState<string>();
  const prompt = stylePreviewPrompt(draft);

  useEffect(() => {
    let cancelled = false;
    void sha256Hex(prompt).then((hash) => {
      if (!cancelled) setDraftHash(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [prompt]);

  // Hold the button until the draft digest is ready, so a matching still cannot be clicked twice.
  if (previewHash && !draftHash) return true;
  return previewIsCurrent(previewHash, draftHash);
}
