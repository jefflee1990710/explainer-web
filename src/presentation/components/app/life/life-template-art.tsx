"use client";

import { useState } from "react";
import { lifePostTemplatePreviewSrc } from "@/model/life-post-template";

// Gemini example still for one post template, with a soft gradient fallback until it exists.
export function LifeTemplateArt({ id, label }: { id: string; label: string }) {
  const src = lifePostTemplatePreviewSrc(id);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#f4fcd4] via-[#fff6eb] to-[#ffe4dc] p-2 text-center text-[10px] font-bold text-accent-ink/70">
        {label}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
  );
}
