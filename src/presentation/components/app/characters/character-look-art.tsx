"use client";

import { useState } from "react";
import {
  characterLookPreviewSrc,
  lookOptionCategory,
  type AnyCharacterLookPart,
} from "@/service/character/character-look";

function FallbackArt({ part, id }: { part: AnyCharacterLookPart; id: string }) {
  const category = lookOptionCategory(part, id);
  const bg =
    category === "extreme"
      ? "from-[#12141c] via-[#272b3a] to-[#12141c] text-[#c6f24b]"
      : category === "stylized"
        ? "from-[#f4fcd4] via-[#fff6eb] to-[#ffe4dc] text-[#12141c]"
        : "from-[#f4f4f5] via-white to-[#e4e4e7] text-[#12141c]";
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${bg} p-2`}>
      <PartGlyph part={part} />
    </div>
  );
}

function PartGlyph({ part }: { part: AnyCharacterLookPart }) {
  const cls = "h-8 w-8 opacity-80";
  if (part === "hair") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M6 15c0-5 2.5-9 6-9s6 4 6 9" />
        <path d="M8 11c1.2-1.5 2.6-2 4-2s2.8.5 4 2" />
        <circle cx="12" cy="14" r="3.5" />
      </svg>
    );
  }
  if (part === "top") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 4.5 4 7l2 3.5 2-1V19.5h8V9.5l2 1L20 7l-4-2.5-2 2h-4l-2-2Z" />
      </svg>
    );
  }
  if (part === "pants") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M7 4.5h10l1.5 15h-4.5L12 11l-2 8.5H5.5L7 4.5Z" />
      </svg>
    );
  }
  if (part === "shoes") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 16.5V10h4l3 3.5h6a3 3 0 0 1 3 3v1.5H4v-1.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="8" cy="13" r="3" />
      <circle cx="16" cy="13" r="3" />
      <path d="M11 13h2M3.5 12.5 5 11M20.5 12.5 19 11" />
    </svg>
  );
}

// Realistic Gemini preview for one look option, with clean Studio SVG fallback.
export function CharacterLookArt({ part, id }: { part: AnyCharacterLookPart; id: string }) {
  const src = characterLookPreviewSrc(part, id);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <FallbackArt part={part} id={id} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className="h-full w-full object-cover"
    />
  );
}
