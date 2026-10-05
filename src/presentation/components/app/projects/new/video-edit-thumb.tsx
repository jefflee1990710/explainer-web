"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

type ImageState = "empty" | "loading" | "ok" | "bad";

// A saved URL can still be an empty or undecodable file.
function useImageState(src?: string): ImageState {
  const [state, setState] = useState<ImageState>(src ? "loading" : "empty");

  useEffect(() => {
    if (!src) {
      setState("empty");
      return;
    }
    setState("loading");
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      setState(image.naturalWidth > 0 ? "ok" : "bad");
    };
    image.onerror = () => {
      if (alive) setState("bad");
    };
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  return state;
}

// Picture when the file decodes; otherwise the empty-slot placeholder.
export function VideoEditThumb({
  src,
  className,
}: {
  src?: string;
  className: string;
}) {
  const state = useImageState(src);
  if (state === "ok" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={className} />
    );
  }
  if (state === "loading") return null;
  return <VideoEditEmptyThumb />;
}

export function VideoEditEmptyThumb() {
  const { t } = useI18n();
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 border border-dashed border-[var(--studio-muted)] bg-[var(--studio-panel)] text-[9px] font-semibold leading-none text-[var(--studio-muted)]">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.4" />
        <path d="M7 16l3.2-3.2L13 15l2-2 3 3" />
      </svg>
      {t("video.layers.unset")}
    </span>
  );
}

export function useDecodableImage(src?: string) {
  return useImageState(src);
}
