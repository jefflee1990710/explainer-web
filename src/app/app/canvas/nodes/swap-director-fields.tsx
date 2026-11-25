"use client";

// Swap director settings: mode, section, ratio, and the edit instruction.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";
import { ComposedInput, ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import { SwapLightLookField } from "@/app/app/canvas/nodes/swap-light-look-field";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
};

export function SwapDirectorFields({ data, isZh, disabled, onUpdate }: Props) {
  const tp = data.toolParams ?? {};
  const mode = String(tp.swapMode ?? "character");
  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, ...patch } });
  const ratio = (data.aspectRatio ?? "9:16") as CanvasAspectRatio;

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "模式" : "Mode"}
        <select
          value={mode}
          onChange={(e) => setParams({ swapMode: e.target.value })}
          className={DIALOG_FIELD}
        >
          <option value="character">{isZh ? "角色替換" : "Character"}</option>
          <option value="object">{isZh ? "物件／穿搭" : "Object / outfit"}</option>
          <option value="relight">{isZh ? "電影打光" : "Relight"}</option>
          <option value="colorfix">{isZh ? "H3 Soft 調色" : "H3 Soft color"}</option>
        </select>
      </label>
      {mode === "object" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className={DIALOG_LABEL}>
            {isZh ? "目標物" : "Target"}
            <ComposedInput
              value={String(tp.objectTarget ?? "")}
              onValue={(objectTarget) => setParams({ objectTarget })}
              placeholder={isZh ? "例如外套" : "e.g. jacket"}
              className={DIALOG_FIELD}
            />
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "做法" : "Edit"}
            <select
              value={String(tp.objectEditMode ?? "change")}
              onChange={(e) => setParams({ objectEditMode: e.target.value })}
              className={DIALOG_FIELD}
            >
              <option value="change">Change</option>
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          </label>
        </div>
      ) : null}
      {mode === "relight" ? (
        <SwapLightLookField
          isZh={isZh}
          disabled={disabled}
          value={typeof tp.lightLookId === "string" ? tp.lightLookId : undefined}
          onChange={(lightLookId) => setParams({ lightLookId })}
        />
      ) : null}
      <label className={DIALOG_LABEL}>
        {mode === "object" ? (isZh ? "換成什麼" : "Change into") : isZh ? "指示" : "Instruction"}
        <ComposedTextarea
          rows={3}
          value={data.prompt ?? ""}
          onValue={(prompt) => onUpdate({ prompt })}
          placeholder={isZh ? "例如換成藍色外套…" : "e.g. change into a blue jacket…"}
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
