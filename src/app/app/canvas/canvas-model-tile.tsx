"use client";

// One addable model tile in the canvas sidebar. Click selects it; Add to Canvas places it.

import { CanvasAddButton } from "@/app/app/canvas/canvas-add-button";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/model-names";

export const CANVAS_DRAG_MODEL_MIME = "application/x-scro-canvas-model";

export function CanvasModelTile({
  spec,
  locale,
  selected,
  addLabel,
  onSelect,
  onAdd,
}: {
  spec: CanvasModelSpec;
  locale: string;
  selected: boolean;
  addLabel: string;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <div
      draggable
      title={canvasModelDisplayName(spec, locale)}
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_MODEL_MIME, spec.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
      data-canvas-pick=""
      onClick={onSelect}
      className={`group relative flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing ${
        selected ? "border-[#c6f24b]" : "border-white/8"
      }`}
    >
      {selected ? <CanvasAddButton label={addLabel} onAdd={onAdd} /> : null}
      <span className="grid h-8 w-8 place-items-center">
        <CanvasModelLogo providerModelId={spec.providerModelId} className="h-7 w-7" />
      </span>
      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">
        {canvasModelDisplayName(spec, locale)}
      </span>
    </div>
  );
}
