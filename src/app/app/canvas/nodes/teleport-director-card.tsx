"use client";

// Teleport director. Build expands trim → render → grade and keeps this card.

import { MapPin, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import {
  readExpandedNodeIds,
  scroDirectorBuildMessage,
  type ScroDirectorBuildError,
} from "@/service/canvas/directors/scro-director";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import { ScroDirectorPort } from "@/app/app/canvas/nodes/scro-director-port";
import { TeleportDirectorFields } from "@/app/app/canvas/nodes/teleport-director-fields";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  videoWired: boolean;
  sceneWired: boolean;
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
  onBuild: () => void;
  onRemove: () => void;
};

export function TeleportDirectorCard({
  data,
  isZh,
  selected,
  disabled,
  videoWired,
  sceneWired,
  onUpdate,
  onBuild,
  onRemove,
}: Props) {
  const sceneText = typeof data.toolParams?.sceneText === "string" ? data.toolParams.sceneText.trim() : "";
  const built = readExpandedNodeIds(data).length > 0;
  const block: ScroDirectorBuildError | undefined = !videoWired ? "video" : !sceneWired && !sceneText ? "scene" : undefined;

  return (
    <div
      className={`relative w-[300px] rounded-[16px] border bg-[#12161f]/95 text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/90">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-[#c6f24b]/15 text-[#c6f24b]">
            <MapPin className="h-3 w-3" />
          </span>
          {isZh ? "換場導演" : "Teleport Director"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title={isZh ? "移除" : "Remove"}
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ScroDirectorPort
        id="video"
        color={PORT_COLOR_MAP.video}
        label={isZh ? "來源影片" : "Source video"}
        title={isZh ? "來源影片" : "Source video"}
        wired={videoWired}
        detail={videoWired ? (isZh ? "已連" : "Wired") : isZh ? "需要" : "Required"}
      />
      <ScroDirectorPort
        id="image"
        color={PORT_COLOR_MAP.image}
        label={isZh ? "場景圖" : "Scene"}
        title={isZh ? "場景圖（可選，沒有就用文字）" : "Scene photo (optional; otherwise the text)"}
        wired={sceneWired}
        detail={sceneWired ? (isZh ? "已連" : "Wired") : isZh ? "或用文字" : "Or use text"}
      />
      <div className="flex flex-col gap-2.5 p-3">
        <TeleportDirectorFields data={data} isZh={isZh} disabled={disabled} onUpdate={onUpdate} />
        {block ? (
          <p className="text-[10.5px] text-white/45">{scroDirectorBuildMessage(block, isZh)}</p>
        ) : (
          <p className="text-[10.5px] text-white/45">
            {isZh
              ? "建立會放下修剪、換場同調色。扣費要再按執行。"
              : "Build adds trim, teleport, and grade. Run is what spends credit."}
          </p>
        )}
        <button
          type="button"
          disabled={disabled || Boolean(block)}
          onClick={onBuild}
          className="nodrag inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {built ? (isZh ? "重建" : "Rebuild") : isZh ? "建立" : "Build"}
        </button>
      </div>
    </div>
  );
}
