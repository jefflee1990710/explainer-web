"use client";

import { useEffect, useState } from "react";
import { directorPreviewFields, directorPreviewSource } from "@/service/director/preview-prompt";
import { previewIsCurrent } from "@/service/style/preview-prompt";
import type { DirectorForm } from "@/presentation/components/app/directors/[id]/director-info-panel";

// Same digest Node stores in previewHash when a still finishes.
async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// True while the draft's still prompt matches the preview already stored.
export function useDirectorPreviewCurrent(previewHash: string | undefined, draft: DirectorForm) {
  const [draftHash, setDraftHash] = useState<string>();
  const prompt = directorPreviewSource(
    directorPreviewFields({
      title: draft.title,
      description: draft.description,
      visual: draft.customProfile.visual,
      hook: draft.customProfile.hook,
      arc: draft.customProfile.arc,
    }),
  );

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
