"use client";

// Talking Head parameters, edited on the node: script, character, language, framing, ratio.

import type { CanvasAspectRatio, CanvasNodeData } from "@/model/canvas";
import type { CanvasLibraryCharacterOption } from "@/service/canvas/projects";
import { getTalkingHeadPose } from "@/model/talking-head-options";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { libraryCharacterChoices } from "@/app/app/canvas/nodes/character-menu-options";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
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

export function TalkingHeadDirectorFields({
  data,
  isZh,
  disabled,
  characterOptions,
  onUpdate,
}: Props) {
  const tp = data.toolParams ?? {};
  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, ...patch } });
  const ratio = (data.aspectRatio ?? "9:16") as CanvasAspectRatio;
  const selectedCharacterId = String(tp.characterId ?? "");
  const characterLabel = isZh ? "角色" : "Character";
  const characterChoices = libraryCharacterChoices(
    characterOptions,
    isZh ? "請選擇角色" : "Choose a character",
  );
  const framingLabel = isZh ? "鏡頭" : "Framing";
  const framingChoices = TALKING_HEAD_FRAMINGS.map((framing) => ({
    value: framing.id,
    label: isZh ? framing.zh : framing.en,
    previewUrl: getTalkingHeadPose(framing.id)?.previewUrl,
    previewShape: "portrait" as const,
  }));

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "講稿" : "Script"}
        <ComposedTextarea
          rows={4}
          value={data.prompt ?? ""}
          onValue={(prompt) => onUpdate({ prompt })}
          placeholder={isZh ? "角色對住鏡頭要講嘅說話…" : "What the character says to camera…"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <div className={DIALOG_LABEL}>
        {characterLabel}
        <CanvasPreviewSelect
          value={selectedCharacterId}
          ariaLabel={characterLabel}
          options={characterChoices}
          onChange={(characterId) => setParams({ characterId: characterId || undefined })}
        />
      </div>
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
      <div className={DIALOG_LABEL}>
        {framingLabel}
        <CanvasPreviewSelect
          value={String(tp.framing ?? "collarbone-close")}
          ariaLabel={framingLabel}
          options={framingChoices}
          onChange={(framing) => setParams({ framing })}
        />
      </div>
      <AspectRatioField isZh={isZh} value={ratio} onChange={(aspectRatio) => onUpdate({ aspectRatio })} />
    </fieldset>
  );
}
