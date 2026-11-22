"use client";

// Life Photo setup: character still + scene → Seedream node group.

import { useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { LifeGroupInput } from "@/service/canvas/scro-groups/life";
import { AspectRatioField } from "./aspect-ratio-field";
import { MediaPickField } from "./media-pick-field";
import { DIALOG_TEXTAREA, ScroDialogShell } from "./scro-dialog-shell";
import type { MediaPickOption } from "./scro-group-options";

type Props = {
  open: boolean;
  isZh: boolean;
  characterOptions: readonly MediaPickOption[];
  onCancel: () => void;
  onSubmit: (values: LifeGroupInput) => void;
};

export function LifeDialog({ open, isZh, characterOptions, onCancel, onSubmit }: Props) {
  const [character, setCharacter] = useState<MediaPickOption | null>(null);
  const [scene, setScene] = useState("");
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立生活照" : "New life photo"}
      description={
        isZh
          ? "會放入角色圖、可編輯的提示詞和 Seedream 5.0 Pro 節點，按 Run 才扣 $0.15。"
          : "Adds the character still, an editable prompt, and a Seedream 5.0 Pro node. Running it costs $0.15."
      }
      submitLabel={isZh ? "建立節點" : "Add nodes"}
      canSubmit={Boolean(character)}
      onCancel={onCancel}
      onSubmit={() => character && onSubmit({ character: character.ref, scene, aspectRatio })}
    >
      <MediaPickField
        label={isZh ? "角色" : "Character"}
        isZh={isZh}
        kind="image"
        options={characterOptions}
        value={character}
        onChange={setCharacter}
      />
      <label className="block text-[11px] text-white/55">
        {isZh ? "場景和氣氛" : "Scene and mood"}
        <textarea
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          rows={3}
          placeholder={isZh ? "例如：週末早上喺咖啡店窗邊看書" : "e.g. Reading by a cafe window on a Sunday morning"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <AspectRatioField isZh={isZh} value={aspectRatio} onChange={setAspectRatio} />
    </ScroDialogShell>
  );
}
