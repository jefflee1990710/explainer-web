"use client";

// Style, video model, and length controls on the video style-transfer card.

import { useState } from "react";
import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import {
  clampVideoStyleDuration,
  videoStyleTransferModelChoices,
} from "@/service/canvas/catalog/video-style-transfer";
import { videoStyleOptions } from "@/app/app/canvas/nodes/video-style-options";
import { VideoStyleModelPicker } from "@/app/app/canvas/nodes/video-style-model-picker";
import { VideoStyleStyleDialog } from "@/app/app/canvas/nodes/video-style-style-dialog";

const FIELD_BUTTON =
  "nodrag w-full cursor-pointer truncate rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-left text-[11px] text-white/90 hover:border-[#c6f24b]/50 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  id: string;
  data: CanvasNodeData;
  catalog: readonly CanvasModelSpec[];
  locale: string;
  isZh: boolean;
  disabled: boolean;
  toolParams: Record<string, unknown>;
  onUpdateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
};

function aspectOrUndefined(value: string | undefined): CanvasAspectRatio | undefined {
  if (value === "16:9" || value === "9:16" || value === "1:1" || value === "4:3" || value === "3:4") {
    return value;
  }
  return undefined;
}

export function VideoStyleTransferFields({
  id,
  data,
  catalog,
  locale,
  isZh,
  disabled,
  toolParams,
  onUpdateNodeData,
}: Props) {
  const [styleOpen, setStyleOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const styleId = typeof toolParams.styleId === "string" ? toolParams.styleId : "";
  const videoModelId = typeof toolParams.videoModelId === "string" ? toolParams.videoModelId : "";
  const styleLabel =
    videoStyleOptions(isZh).find((style) => style.id === styleId)?.label ??
    (isZh ? "選擇風格" : "Choose style");
  const videoModel = videoModelId ? findCanvasModel(videoModelId, catalog) : undefined;
  const modelLabel = videoModel
    ? canvasModelDisplayName(videoModel, locale)
    : isZh
      ? "選擇影片模型"
      : "Choose video model";
  const durationModel =
    videoModel && videoStyleTransferModelChoices(catalog).some((spec) => spec.id === videoModel.id)
      ? videoModel
      : undefined;
  const durationSeconds = durationModel
    ? clampVideoStyleDuration(durationModel, data.durationSeconds)
    : (data.durationSeconds ?? 5);

  function chooseStyle(nextStyleId: string) {
    onUpdateNodeData(id, { toolParams: { ...toolParams, styleId: nextStyleId } });
    setStyleOpen(false);
  }

  function chooseModel(nextModelId: string) {
    const next = videoStyleTransferModelChoices(catalog).find((spec) => spec.id === nextModelId);
    const patch: Partial<CanvasNodeData> = {
      toolParams: { ...toolParams, videoModelId: nextModelId },
    };
    if (next) {
      patch.durationSeconds = clampVideoStyleDuration(next, data.durationSeconds ?? next.defaultDurationSeconds);
      if (data.aspectRatio && !next.presets.includes(data.aspectRatio)) {
        patch.aspectRatio = aspectOrUndefined(next.defaultPresetId);
      }
    }
    onUpdateNodeData(id, patch);
    setModelOpen(false);
  }

  return (
    <div className="space-y-2 rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-white/50">{isZh ? "風格" : "Style"}</span>
        <button
          type="button"
          disabled={disabled}
          aria-label={isZh ? "選擇風格" : "Choose style"}
          onClick={() => setStyleOpen(true)}
          className={FIELD_BUTTON}
        >
          {styleLabel}
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-white/50">{isZh ? "影片模型" : "Video model"}</span>
        <button
          type="button"
          disabled={disabled}
          aria-label={isZh ? "選擇影片模型" : "Choose video model"}
          onClick={() => setModelOpen(true)}
          className={FIELD_BUTTON}
        >
          {modelLabel}
        </button>
      </div>
      {durationModel ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-white/50">
            {isZh ? "秒數" : "Duration"} ({durationSeconds}s)
          </label>
          <input
            type="number"
            min={durationModel.minDurationSeconds ?? 5}
            max={durationModel.maxDurationSeconds ?? 15}
            value={durationSeconds}
            disabled={disabled}
            aria-label={isZh ? "影片秒數" : "Video duration"}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (!Number.isFinite(parsed)) return;
              onUpdateNodeData(id, {
                durationSeconds: clampVideoStyleDuration(durationModel, parsed),
              });
            }}
            className="nodrag rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ) : null}
      {styleOpen ? (
        <VideoStyleStyleDialog
          selectedId={styleId}
          isZh={isZh}
          onCancel={() => setStyleOpen(false)}
          onSelect={chooseStyle}
        />
      ) : null}
      {modelOpen ? (
        <VideoStyleModelPicker
          catalog={catalog}
          selectedId={videoModelId}
          locale={locale}
          onCancel={() => setModelOpen(false)}
          onSelect={chooseModel}
        />
      ) : null}
    </div>
  );
}
