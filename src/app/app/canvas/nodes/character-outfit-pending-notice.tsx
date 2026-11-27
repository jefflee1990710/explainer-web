"use client";

// Warning on a model card whose wired character has outfit pieces but no generated look yet.
// Running would otherwise silently use the character's default outfit.

import { Shirt } from "lucide-react";
import {
  characterOutfitPendingMessage,
  type CharacterOutfitPending,
} from "@/service/canvas/core/character-wardrobe";

export function CharacterOutfitPendingNotice({
  pending,
  isZh,
}: {
  pending: readonly CharacterOutfitPending[];
  isZh: boolean;
}) {
  if (pending.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid="character-outfit-pending"
      className="flex items-start gap-1.5 rounded-[10px] border border-amber-400/35 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-100"
    >
      <Shirt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
      <span>{characterOutfitPendingMessage(pending, isZh)}</span>
    </div>
  );
}
