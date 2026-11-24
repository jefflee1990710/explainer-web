"use client";

// Character node: the person stays one card, and each outfit slot is an image input.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Maximize2, Shirt, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { BLUEPRINT_COST_USD } from "@/service/credit-costs";
import { formatUsd } from "@/service/billing/usd";
import { CHARACTER_OUTFIT_PORTS } from "@/service/canvas/character-node";
import { OutdatedBanner, OutdatedPreviewTag } from "@/app/app/canvas/nodes/outdated-notice";
import {
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";

export function CharacterNodeCard({
  id,
  data,
  selected,
}: NodeProps & { data: CanvasNodeData }) {
  const { edges, locale, onDeleteNode, onOpenLightbox, onGenerateOutfit, onUpdateNodeData, outdatedNodes } =
    useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const color = PORT_COLOR_MAP.image;
  const name = data.label || data.fileName || (isZh ? "角色" : "Character");
  const busy = data.status === "queued" || data.status === "running";
  const incoming = new Set(
    edges.filter((edge) => edge.target === id && edge.targetHandle).map((edge) => edge.targetHandle),
  );
  const resultUrl = data.outputUrl?.trim();
  const outdated = busy ? undefined : outdatedNodes.get(id);

  return (
    <div
      className={`group relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        data.status === "failed"
          ? `border-2 border-rose-500/80 ${selected ? "ring-2 ring-rose-500/30" : ""}`
          : selected
            ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25"
            : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#c6f24b]/15 text-[#c6f24b]">
            <Shirt className="h-3 w-3" />
          </span>
          <span className="truncate text-[11.5px] font-semibold text-white/90">{name}</span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title={isZh ? "刪除節點" : "Delete node"}
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2.5 pb-2">
        {data.mediaUrl ? (
          <div className="relative overflow-hidden rounded-[10px] bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.mediaUrl} alt={name} className="max-h-[140px] w-full object-contain" />
            <button
              type="button"
              onClick={() => onOpenLightbox({ url: data.mediaUrl!, kind: "image", title: name })}
              className="nodrag absolute top-1.5 right-1.5 cursor-pointer rounded-md bg-black/65 p-1 text-white/85 opacity-0 transition group-hover:opacity-100 hover:bg-black"
              title={isZh ? "放大" : "Expand preview"}
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="grid h-20 place-items-center rounded-[10px] border border-dashed border-white/15 text-xs text-white/45">
            {isZh ? "尚無角色圖" : "No character image"}
          </div>
        )}
      </div>

      <div className="space-y-1 border-y border-white/6 py-2">
        {CHARACTER_OUTFIT_PORTS.map((port) => {
          const connected = incoming.has(port.id);
          return (
            <div key={port.id} className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]">
              <Handle
                type="target"
                id={port.id}
                position={Position.Left}
                style={{
                  width: 11,
                  height: 11,
                  backgroundColor: connected ? color : "#12161f",
                  border: `2px solid ${color}`,
                  left: -6,
                }}
              />
              <span className="text-white/80">{isZh ? port.zh : port.en}</span>
              <span className="text-[10px] text-white/35">
                {connected ? (isZh ? "已連接" : "Connected") : isZh ? "輸入" : "Input"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 p-2.5">
        {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}
        {resultUrl ? (
          <div className={`relative overflow-hidden rounded-[10px] bg-black/40 ${outdated ? "opacity-70" : ""}`}>
            {outdated ? <OutdatedPreviewTag isZh={isZh} /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt={isZh ? "新造型" : "New outfit"} className="max-h-[140px] w-full object-contain" />
          </div>
        ) : null}
        {data.status === "failed" && data.lastError ? (
          <p className="text-[11px] leading-4 text-rose-300">{data.lastError}</p>
        ) : null}
        <label className="nodrag flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/70">
          <input
            type="checkbox"
            disabled={busy}
            checked={data.toolParams?.updateDefaultOutfit === true}
            onChange={(event) =>
              onUpdateNodeData(id, {
                toolParams: {
                  ...(data.toolParams ?? {}),
                  updateDefaultOutfit: event.target.checked,
                },
              })
            }
            className="nodrag accent-[#c6f24b]"
          />
          {isZh ? "更新角色預設造型" : "Update default outfit"}
        </label>
        <button
          type="button"
          disabled={busy || incoming.size === 0 || !onGenerateOutfit}
          onClick={() => onGenerateOutfit?.(id)}
          className="nodrag flex w-full cursor-pointer items-center justify-center rounded-[10px] bg-[#c6f24b] px-2 py-1.5 text-[11.5px] font-semibold text-[#11141b] transition hover:bg-[#d4f57a] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy
            ? isZh
              ? "正在生成新造型…"
              : "Generating outfit…"
            : isZh
              ? `生成新造型 · ${formatUsd(BLUEPRINT_COST_USD)}`
              : `New outfit · ${formatUsd(BLUEPRINT_COST_USD)}`}
        </button>
        <div className="flex items-center justify-between text-[10.5px] text-white/50">
          <span className="uppercase tracking-wider">{isZh ? "角色" : "Character"}</span>
          <span className="flex items-center gap-1 font-medium" style={{ color }}>
            {isZh ? "新造型" : "Outfit"}
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          </span>
        </div>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          border: "2px solid #0b0e13",
        }}
      />
    </div>
  );
}
