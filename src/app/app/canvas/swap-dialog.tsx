"use client";

// Scro Swap setup: source video, mode, reference / light look, and the 2–15s section.

import { useState } from "react";
import type { CanvasAspectRatio } from "@/model/canvas";
import type { SwapGroupInput } from "@/service/canvas/scro-groups/swap";
import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { AspectRatioField } from "./aspect-ratio-field";
import { MediaPickField } from "./media-pick-field";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA, ScroDialogShell } from "./scro-dialog-shell";
import type { MediaPickOption } from "./scro-group-options";
import { SectionFields } from "./section-fields";

type Props = {
  open: boolean;
  isZh: boolean;
  videoOptions: readonly MediaPickOption[];
  referenceOptions: readonly MediaPickOption[];
  onCancel: () => void;
  onSubmit: (values: SwapGroupInput) => void;
};

export function SwapDialog({ open, isZh, videoOptions, referenceOptions, onCancel, onSubmit }: Props) {
  const [video, setVideo] = useState<MediaPickOption | null>(null);
  const [mode, setMode] = useState<SwapGroupInput["mode"]>("character");
  const [reference, setReference] = useState<MediaPickOption | null>(null);
  const [instruction, setInstruction] = useState("");
  const [objectTarget, setObjectTarget] = useState("");
  const [objectEditMode, setObjectEditMode] = useState<"change" | "add" | "remove">("change");
  const [lightLookId, setLightLookId] = useState(JUTSU_LIGHT_LOOKS[0]?.id ?? "");
  const [section, setSection] = useState({ start: 0, length: 6 });
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>("9:16");

  const canSubmit =
    Boolean(video) &&
    (mode !== "character" || Boolean(reference)) &&
    (mode !== "object" || objectTarget.trim().length > 0);

  return (
    <ScroDialogShell
      open={open}
      isZh={isZh}
      title={isZh ? "建立 Scro Swap" : "New Scro Swap"}
      description={
        isZh
          ? "會放入裁剪、換角渲染和調色節點。換角渲染按秒收費（$0.15 + $0.10/秒），其他 FFmpeg 節點免費。"
          : "Adds trim, swap render, and colour grade nodes. The render costs $0.15 + $0.10/s; FFmpeg nodes are free."
      }
      submitLabel={isZh ? "建立節點" : "Add nodes"}
      canSubmit={canSubmit}
      onCancel={onCancel}
      onSubmit={() =>
        video &&
        onSubmit({
          video: video.ref,
          mode,
          ...(reference && (mode === "character" || mode === "object") ? { reference: reference.ref } : {}),
          ...(instruction.trim() ? { instruction } : {}),
          ...(mode === "object" ? { objectTarget: objectTarget.trim(), objectEditMode } : {}),
          ...(mode === "relight" ? { lightLookId } : {}),
          sectionStart: section.start,
          sectionLength: section.length,
          aspectRatio,
        })
      }
    >
      <MediaPickField
        label={isZh ? "原片" : "Source video"}
        isZh={isZh}
        kind="video"
        options={videoOptions}
        value={video}
        onChange={setVideo}
      />
      <label className={DIALOG_LABEL}>
        {isZh ? "模式" : "Mode"}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as SwapGroupInput["mode"])}
          className={DIALOG_FIELD}
        >
          <option value="character">{isZh ? "角色替換" : "Character swap"}</option>
          <option value="object">{isZh ? "物件／穿搭替換" : "Object / outfit"}</option>
          <option value="relight">{isZh ? "電影打光" : "Relight"}</option>
          <option value="colorfix">{isZh ? "只調色（H3 Soft）" : "Colour fix only (H3 Soft)"}</option>
        </select>
      </label>

      {mode === "character" || mode === "object" ? (
        <MediaPickField
          label={mode === "character" ? (isZh ? "新角色" : "New character") : isZh ? "參考圖（選填）" : "Reference (optional)"}
          isZh={isZh}
          kind="image"
          options={referenceOptions}
          value={reference}
          onChange={setReference}
        />
      ) : null}

      {mode === "object" ? (
        <div className="grid grid-cols-2 gap-2.5">
          <label className={DIALOG_LABEL}>
            {isZh ? "目標物" : "Target"}
            <input
              value={objectTarget}
              onChange={(e) => setObjectTarget(e.target.value)}
              placeholder={isZh ? "例如：外套" : "e.g. jacket"}
              className={DIALOG_FIELD}
            />
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "動作" : "Action"}
            <select
              value={objectEditMode}
              onChange={(e) => setObjectEditMode(e.target.value as "change" | "add" | "remove")}
              className={DIALOG_FIELD}
            >
              <option value="change">{isZh ? "替換" : "Change"}</option>
              <option value="add">{isZh ? "加入" : "Add"}</option>
              <option value="remove">{isZh ? "移除" : "Remove"}</option>
            </select>
          </label>
        </div>
      ) : null}

      {mode === "relight" ? (
        <label className={DIALOG_LABEL}>
          {isZh ? "打光風格" : "Light look"}
          <select value={lightLookId} onChange={(e) => setLightLookId(e.target.value)} className={DIALOG_FIELD}>
            {JUTSU_LIGHT_LOOKS.map((look) => (
              <option key={look.id} value={look.id}>
                {isZh ? look.nameZhHant : look.nameEn}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {mode !== "colorfix" ? (
        <>
          <label className="block text-[11px] text-white/55">
            {mode === "object"
              ? isZh ? "換成甚麼（選填）" : "Change to (optional)"
              : isZh ? "額外指示（選填）" : "Extra instruction (optional)"}
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              className={DIALOG_TEXTAREA}
            />
          </label>
          <SectionFields isZh={isZh} start={section.start} length={section.length} onChange={setSection} />
          <AspectRatioField isZh={isZh} value={aspectRatio} onChange={setAspectRatio} />
        </>
      ) : null}
    </ScroDialogShell>
  );
}
