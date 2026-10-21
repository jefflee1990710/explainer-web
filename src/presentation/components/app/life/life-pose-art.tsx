"use client";

import { useState } from "react";
import { lifePoseImagePath, lifePosePreviewSrc } from "@/model/life-pose";

// Scro pose preview still for one pose card, with skeleton fallback if missing.
export function LifePoseArt({ id }: { id: string }) {
  const src = lifePosePreviewSrc(id);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={lifePoseImagePath(id)} alt="" loading="lazy" className="h-full w-full object-contain" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
  );
}
