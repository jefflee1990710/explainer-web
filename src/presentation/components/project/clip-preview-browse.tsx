"use client";

import { useI18n } from "@/presentation/components/i18n-provider";

// Round arrow on the preview edge. Moves to the previous or next clip.
export function ClipPreviewBrowse({
  direction,
  clipNumber,
  onSelect,
}: {
  direction: "prev" | "next";
  clipNumber?: number;
  onSelect: (clipNumber: number) => void;
}) {
  const { t } = useI18n();
  const next = direction === "next";
  const label =
    clipNumber !== undefined
      ? t(next ? "production.clip.nextClip" : "production.clip.prevClip", { n: clipNumber })
      : t(next ? "production.clip.noNextClip" : "production.clip.noPrevClip");

  return (
    <button
      type="button"
      disabled={clipNumber === undefined}
      aria-label={label}
      onClick={() => clipNumber !== undefined && onSelect(clipNumber)}
      className={`absolute top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[var(--studio-line)] bg-white/95 text-[var(--studio-ink)] shadow-sm transition hover:bg-white disabled:cursor-default disabled:opacity-35 ${
        next ? "right-3" : "left-3"
      }`}
    >
      <Chevron direction={direction} />
    </button>
  );
}

function Chevron({ direction }: { direction: "prev" | "next" }) {
  const next = direction === "next";
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d={next ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
