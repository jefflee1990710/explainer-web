"use client";

// Outfit tiles in the canvas Assets drawer. Drag one onto a character node to connect it.

import { CanvasAddButton } from "@/app/app/canvas/canvas-add-button";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import { outfitHandleForPart } from "@/service/canvas/character-node";

const CANVAS_DRAG_ASSET_MIME = "application/x-scro-canvas-asset";

const PART_LABEL: Record<string, { zh: string; en: string }> = {
  hair: { zh: "髮型", en: "Hair" },
  top: { zh: "上衣", en: "Top" },
  pants: { zh: "褲子", en: "Pants" },
  shoes: { zh: "鞋子", en: "Shoes" },
  accessory: { zh: "配件", en: "Accessory" },
  looks: { zh: "整套", en: "Look" },
};

export function CanvasOutfitTile({
  isZh,
  asset,
  dense = false,
  selected = false,
  addLabel,
  onSelect,
  onAddAsset,
}: {
  isZh: boolean;
  asset: CanvasLibraryAsset;
  // Half-size tile used when the sidebar is wide enough for four columns.
  dense?: boolean;
  selected?: boolean;
  addLabel: string;
  onSelect: () => void;
  onAddAsset: (asset: CanvasLibraryAsset) => void;
}) {
  const handle = outfitHandleForPart(asset.outfitPart);
  const part = PART_LABEL[handle];
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CANVAS_DRAG_ASSET_MIME, JSON.stringify(asset));
        event.dataTransfer.effectAllowed = "copy";
      }}
      data-canvas-pick=""
      onClick={onSelect}
      className={`group relative cursor-grab overflow-hidden border bg-[#131823] transition hover:border-[#c6f24b]/60 active:cursor-grabbing ${
        selected ? "border-[#c6f24b]" : "border-white/8"
      } ${dense ? "rounded-[7px]" : "rounded-[10px]"}`}
    >
      {selected ? (
        <CanvasAddButton dense={dense} label={addLabel} onAdd={() => onAddAsset(asset)} />
      ) : null}
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#10141c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl || asset.url}
          alt={asset.name}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      </div>
      <span
        className={`absolute rounded-full bg-black/70 font-semibold text-[#d4f57a] ${
          dense ? "top-0.5 left-0.5 px-1 py-px text-[8px]" : "top-1 left-1 px-1.5 py-0.5 text-[9px]"
        }`}
      >
        {part ? (isZh ? part.zh : part.en) : isZh ? "整套" : "Look"}
      </span>
      <div
        className={`truncate bg-[#0c0f16]/90 font-medium text-white/80 ${
          dense ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-1 text-[10px]"
        }`}
      >
        {asset.name}
      </div>
    </div>
  );
}

