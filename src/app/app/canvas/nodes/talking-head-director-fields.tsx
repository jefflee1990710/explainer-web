"use client";

// Talking Head parameters, edited on the node: script, character, language, framing, ratio.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";

export const TALKING_HEAD_FRAMINGS = [
  { id: "collarbone-close", zh: "近鏡（鎖骨以上）", en: "Close-up" },
  { id: "waist-up", zh: "半身（坐低）", en: "Waist up (seated)" },
  { id: "handheld-selfie", zh: "手持自拍", en: "Handheld selfie" },
  { id: "full-body", zh: "全身", en: "Full body" },
] as const;

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
};

export function TalkingHeadDirectorFields({ data, isZh, disabled, characterOptions, onUpdate }: Props) {
  const tp = data.toolParams ?? {};
  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, ...patch } });
  const ratio = (data.aspectRatio ?? "9:16") as CanvasAspectRatio;

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "講稿" : "Script"}
        <textarea
          rows={4}
          value={data.prompt ?? ""}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          placeholder={isZh ? "角色對住鏡頭要講嘅說話…" : "What the character says to camera…"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <label className={DIALOG_LABEL}>
        {isZh ? "角色" : "Character"}
        <select
          value={String(tp.characterId ?? "")}
          onChange={(e) => setParams({ characterId: e.target.value || undefined })}
          className={DIALOG_FIELD}
        >
          <option value="">{isZh ? "請選擇角色" : "Choose a character"}</option>
          {characterOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={DIALOG_LABEL}>
          {isZh ? "語言" : "Language"}
          <select
            value={String(tp.language ?? "yue")}
            onChange={(e) => setParams({ language: e.target.value })}
            className={DIALOG_FIELD}
          >
            <option value="yue">廣東話</option>
            <option value="zh">國語</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className={DIALOG_LABEL}>
          {isZh ? "鏡頭" : "Framing"}
          <select
            value={String(tp.framing ?? "collarbone-close")}
            onChange={(e) => setParams({ framing: e.target.value })}
            className={DIALOG_FIELD}
          >
            {TALKING_HEAD_FRAMINGS.map((f) => (
              <option key={f.id} value={f.id}>
                {isZh ? f.zh : f.en}
              </option>
            ))}
          </select>
        </label>
      </div>
      <AspectRatioField isZh={isZh} value={ratio} onChange={(aspectRatio) => onUpdate({ aspectRatio })} />
    </fieldset>
  );
}
