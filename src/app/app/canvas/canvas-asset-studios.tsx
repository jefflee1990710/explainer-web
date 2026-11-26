"use client";

// Icon buttons on the canvas Assets tab. Each one opens the character dialog
// already on photo or prompt.

import { useState } from "react";
import { ImagePlus, PenLine } from "lucide-react";
import { InlineCreateCharacterDialog } from "@/presentation/components/app/projects/[id]/inline-create-character-dialog";
import type { PublicCharacter } from "@/presentation/serialize";

type CreateMode = "image" | "text";

const iconButton =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/5 text-white/75 transition hover:border-[#c6f24b]/50 hover:text-white";

export function CanvasAssetStudios({
  isZh,
  creditUsd,
  subscribed,
  onCreated,
}: {
  isZh: boolean;
  creditUsd: number;
  subscribed: boolean;
  onCreated: (character: PublicCharacter) => void;
}) {
  const [mode, setMode] = useState<CreateMode | null>(null);
  const imageLabel = isZh ? "用相片建立角色" : "Create character from a photo";
  const promptLabel = isZh ? "用描述建立角色" : "Create character from a prompt";

  return (
    <>
      <div className="mb-2 flex items-center gap-1.5">
        <button type="button" title={imageLabel} aria-label={imageLabel} onClick={() => setMode("image")} className={iconButton}>
          <ImagePlus className="h-4 w-4" />
        </button>
        <button type="button" title={promptLabel} aria-label={promptLabel} onClick={() => setMode("text")} className={iconButton}>
          <PenLine className="h-4 w-4" />
        </button>
      </div>
      {mode ? (
        <InlineCreateCharacterDialog
          key={mode}
          styles={[]}
          credits={creditUsd}
          subscribed={subscribed}
          initialTab={mode}
          onCreated={onCreated}
          onClose={() => setMode(null)}
        />
      ) : null}
    </>
  );
}
