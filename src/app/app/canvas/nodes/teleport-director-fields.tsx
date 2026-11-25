"use client";

// Teleport director settings: scene words, mood, section, and ratio.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
};

export function TeleportDirectorFields({ data, isZh, disabled, onUpdate }: Props) {
  const tp = data.toolParams ?? {};
  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, ...patch } });
  const ratio = (data.aspectRatio ?? "9:16") as CanvasAspectRatio;

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "場景" : "Scene"}
        <ComposedTextarea
          rows={3}
          value={String(tp.sceneText ?? "")}
          onValue={(sceneText) => setParams({ sceneText })}
          placeholder={isZh ? "沒有場景圖時，用文字畫一張空場景…" : "With no scene photo, these words draw an empty plate…"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <label className={DIALOG_LABEL}>
        {isZh ? "氣氛" : "Mood"}
        <ComposedTextarea
          rows={2}
          value={data.prompt ?? ""}
          onValue={(prompt) => onUpdate({ prompt })}
          placeholder={isZh ? "可選，例如更冷的光" : "Optional, e.g. colder light"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className={DIALOG_LABEL}>
          {isZh ? "開始（秒）" : "Start (s)"}
          <input
            type="number"
            min={0}
            step={0.1}
            value={Number(tp.sectionStart ?? 0)}
            onChange={(e) => setParams({ sectionStart: Number(e.target.value) })}
            className={DIALOG_FIELD}
          />
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "長度（秒）" : "Length (s)"}
          <input
            type="number"
            min={2}
            max={15}
            step={1}
            value={Number(tp.sectionLength ?? 6)}
            onChange={(e) => setParams({ sectionLength: Number(e.target.value) })}
            className={DIALOG_FIELD}
          />
        </label>
        <AspectRatioField isZh={isZh} value={ratio} onChange={(aspectRatio) => onUpdate({ aspectRatio })} />
      </div>
    </fieldset>
  );
}
