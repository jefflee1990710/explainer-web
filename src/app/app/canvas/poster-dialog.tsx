"use client";

// Poster setup: design prompt + optional character / product → Seedream node group.

import { useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { PosterGroupInput } from "@/service/canvas/scro-groups/poster";
import { AspectRatioField } from "./aspect-ratio-field";
import { MediaPickField } from "./media-pick-field";
import { DIALOG_TEXTAREA, ScroDialogShell } from "./scro-dialog-shell";
import type { MediaPickOption } from "./scro-group-options";

type Props = {
  open: boolean;
  isZh: boolean;
  characterOptions: readonly MediaPickOption[];
  productOptions: readonly MediaPickOption[];
  onCancel: () => void;
  onSubmit: (values: PosterGroupInput) => void;
};

export function PosterDialog({ open, isZh, characterOptions, productOptions, onCancel, onSubmit }: Props) {
  const [prompt, setPrompt] = useState("");
  const [character, setCharacter] = useState<MediaPickOption | null>(null);
  const [product, setProduct] = useState<MediaPickOption | null>(null);
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立海報貼文" : "New poster"}
      description={
        isZh
          ? "會放入角色／產品圖、海報提示詞和 Seedream 5.0 Pro 節點，按 Run 才扣 $0.15。"
          : "Adds the character / product stills, the poster prompt, and a Seedream 5.0 Pro node. Running it costs $0.15."
      }
      submitLabel={isZh ? "建立節點" : "Add nodes"}
      canSubmit={prompt.trim().length > 0}
      onCancel={onCancel}
      onSubmit={() =>
        onSubmit({
          prompt,
          aspectRatio,
          ...(character ? { character: { ref: character.ref, name: character.label } } : {}),
          ...(product ? { product: { ref: product.ref, name: product.label } } : {}),
        })
      }
    >
      <label className="block text-[11px] text-white/55">
        {isZh ? "海報內容" : "Poster brief"}
        <textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder={isZh ? "例如：夏日新品上市，清爽藍白配色" : "e.g. Summer launch, fresh blue and white"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <MediaPickField
        label={isZh ? "角色（選填）" : "Character (optional)"}
        isZh={isZh}
        kind="image"
        options={characterOptions}
        value={character}
        onChange={setCharacter}
      />
      <MediaPickField
        label={isZh ? "產品（選填）" : "Product (optional)"}
        isZh={isZh}
        kind="image"
        options={productOptions}
        value={product}
        onChange={setProduct}
      />
      <AspectRatioField isZh={isZh} value={aspectRatio} onChange={setAspectRatio} />
    </ScroDialogShell>
  );
}
