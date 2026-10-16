"use client";

import { characterLookPreviewSrc, type AnyCharacterLookPart } from "@/service/character/character-look";

// Realistic Gemini preview for one look option.
export function CharacterLookArt({ part, id }: { part: AnyCharacterLookPart; id: string }) {
  const src = characterLookPreviewSrc(part, id);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-full w-full object-cover" />
  );
}
