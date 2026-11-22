"use client";

// Outfit tiles in the canvas Assets drawer. Drag one onto a character node to connect it.

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
  onAddAsset,
}: {
  isZh: boolean;
  asset: CanvasLibraryAsset;
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
      onClick={() => onAddAsset(asset)}
      className="group relative cursor-grab overflow-hidden rounded-[10px] border border-white/8 bg-[#131823] transition hover:border-[#c6f24b]/60 active:cursor-grabbing"
    >
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#10141c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl || asset.url}
          alt={asset.name}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      </div>
      <span className="absolute top-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-[#d4f57a]">
        {part ? (isZh ? part.zh : part.en) : isZh ? "整套" : "Look"}
      </span>
      <div className="truncate bg-[#0c0f16]/90 px-1.5 py-1 text-[10px] font-medium text-white/80">
        {asset.name}
      </div>
    </div>
  );
}

