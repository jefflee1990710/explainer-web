"use client";

// Character picker for a Swap director. Shown only after a source video exists.

import type { CanvasLibraryCharacterOption } from "@/model/canvas-dto";
import { libraryCharacterChoices } from "@/app/app/canvas/nodes/character-menu-options";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";

type Props = {
  isZh: boolean;
  characterId: string;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onChange: (characterId: string) => void;
};

export function SwapDirectorCharacterField({ isZh, characterId, characterOptions, onChange }: Props) {
  const label = isZh ? "角色" : "Character";
  return (
    <div className={DIALOG_LABEL}>
      {label}
      <CanvasPreviewSelect
        value={characterId}
        ariaLabel={label}
        options={libraryCharacterChoices(characterOptions, isZh ? "請選擇角色" : "Choose a character")}
        onChange={onChange}
      />
    </div>
  );
}
