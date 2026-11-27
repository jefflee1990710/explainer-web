"use client";

// Swap director settings. Mode stays Character. Start, length, and ratio come from the source video.

import { useEffect, useMemo } from "react";
import type { CanvasLibraryCharacterOption } from "@/model/canvas-dto";
import type { CanvasNode, CanvasNodeData } from "@/model/canvas";
import { DIALOG_FIELD, DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import { SourceVideoSectionFields } from "@/app/app/canvas/nodes/source-video-section-fields";
import { SwapDirectorCharacterField } from "@/app/app/canvas/nodes/swap-director-character-field";
import {
  mergeSourceVideoMeasure,
  sectionFromSourceVideo,
  sourceVideoFromNode,
} from "@/app/app/canvas/nodes/source-video-section";
import { useSourceVideoProbe } from "@/app/app/canvas/nodes/use-source-video-probe";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  sourceNode: CanvasNode | undefined;
  characterOptions: readonly CanvasLibraryCharacterOption[];
  onUpdate: (patch: Partial<CanvasNodeData>) => void;
};

export function SwapDirectorFields({
  data,
  isZh,
  disabled,
  sourceNode,
  characterOptions,
  onUpdate,
}: Props) {
  const tp = data.toolParams ?? {};
  const source = sourceVideoFromNode(sourceNode);
  const probe = useSourceVideoProbe(source?.url);
  const section = useMemo(
    () => sectionFromSourceVideo(mergeSourceVideoMeasure(source?.measure, probe)),
    [source, probe],
  );
  const sectionKey = section ? `${section.start}|${section.length}|${section.ratio}` : "";
  const characterId = typeof tp.characterId === "string" ? tp.characterId : "";

  // Keep the card on Character, and store the section once the source video can be read.
  useEffect(() => {
    const current = data.toolParams ?? {};
    const patch: Record<string, unknown> = {};
    if (current.swapMode !== "character") patch.swapMode = "character";
    if (section) {
      if (Number(current.sectionStart) !== section.start) patch.sectionStart = section.start;
      if (Number(current.sectionLength) !== section.length) patch.sectionLength = section.length;
    }
    const aspect = section && data.aspectRatio !== section.ratio ? section.ratio : undefined;
    if (!aspect && Object.keys(patch).length === 0) return;
    onUpdate({
      ...(aspect ? { aspectRatio: aspect } : {}),
      toolParams: { ...current, ...patch },
    });
  }, [data.aspectRatio, data.toolParams, onUpdate, section, sectionKey]);

  const setParams = (patch: Record<string, unknown>) => onUpdate({ toolParams: { ...tp, swapMode: "character", ...patch } });

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-60">
      <label className={DIALOG_LABEL}>
        {isZh ? "模式" : "Mode"}
        <select value="character" disabled aria-label={isZh ? "模式" : "Mode"} className={DIALOG_FIELD}>
          <option value="character">{isZh ? "角色替換" : "Character"}</option>
        </select>
      </label>
      {source ? (
        <SwapDirectorCharacterField
          isZh={isZh}
          characterId={characterId}
          characterOptions={characterOptions}
          onChange={(next) => setParams({ characterId: next || undefined })}
        />
      ) : null}
      <label className={DIALOG_LABEL}>
        {isZh ? "指示" : "Instruction"}
        <ComposedTextarea
          rows={3}
          value={data.prompt ?? ""}
          onValue={(prompt) => onUpdate({ prompt })}
          placeholder={isZh ? "例如換成藍色外套…" : "e.g. change into a blue jacket…"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <SourceVideoSectionFields isZh={isZh} section={section} />
    </fieldset>
  );
}
