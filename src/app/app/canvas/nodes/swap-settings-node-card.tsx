"use client";

// Swap Settings node: section, mode, light look, ratio, and grade for a Swap group.
// Edits save straight to the node and apply when the wired nodes run.

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { SWAP_OBJECT_EDIT_MODES, type SwapSettings } from "@/model/canvas-settings";
import { JUTSU_LIGHT_LOOKS } from "@/service/jutsu/light-looks";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { SectionFields } from "@/app/app/canvas/section-fields";
import { DIALOG_FIELD, DIALOG_LABEL } from "@/app/app/canvas/scro-dialog-shell";
import { CanvasPreviewSelect } from "@/app/app/canvas/nodes/canvas-preview-select";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { GradeLookField, ToolSettingsShell } from "@/app/app/canvas/nodes/tool-settings-shell";

// Color fix has no render step, so it is never offered on a group that renders.
const RENDER_MODES = ["character", "object", "relight"] as const;
const MODE_LABELS: Record<SwapSettings["swapMode"], { zh: string; en: string }> = {
  character: { zh: "角色替換", en: "Character swap" },
  object: { zh: "物件／穿搭替換", en: "Object / outfit" },
  relight: { zh: "電影打光", en: "Relight" },
  colorfix: { zh: "只調色（H3 Soft）", en: "Colour fix only (H3 Soft)" },
};
const EDIT_LABELS: Record<(typeof SWAP_OBJECT_EDIT_MODES)[number], { zh: string; en: string }> = {
  change: { zh: "替換", en: "Change" },
  add: { zh: "加入", en: "Add" },
  remove: { zh: "移除", en: "Remove" },
};

export function SwapSettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, nodes, edges, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  if (data.settings?.kind !== "swap") return null;
  const values = data.settings.values;
  const def = settingsKindDef("swap");
  const pick = (l: { zh: string; en: string }) => (isZh ? l.zh : l.en);
  const update = (patch: Partial<SwapSettings>) =>
    onUpdateNodeData(id, { settings: { kind: "swap", values: { ...values, ...patch } } });
  const rendersVideo = edges.some(
    (e) =>
      e.source === id &&
      e.targetHandle === SETTINGS_HANDLE &&
      nodes.find((n) => n.id === e.target)?.data.modelId === "scro:swap-render",
  );
  const colorFixOnly = !rendersVideo && values.swapMode === "colorfix";

  return (
    <ToolSettingsShell isZh={isZh} title={pick(def.label)} color={def.color} selected={Boolean(selected)}>
      {colorFixOnly ? (
        <p className="text-[11px] text-white/60">{pick(MODE_LABELS.colorfix)}</p>
      ) : (
        <label className={DIALOG_LABEL}>
          {isZh ? "模式" : "Mode"}
          <select
            value={values.swapMode}
            onChange={(e) => update({ swapMode: e.target.value as SwapSettings["swapMode"] })}
            className={DIALOG_FIELD}
          >
            {RENDER_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {pick(MODE_LABELS[mode])}
              </option>
            ))}
          </select>
        </label>
      )}

      {values.swapMode === "object" ? (
        <div className="grid grid-cols-2 gap-2.5">
          <label className={DIALOG_LABEL}>
            {isZh ? "目標物" : "Target"}
            <input
              value={values.objectTarget ?? ""}
              onChange={(e) => update({ objectTarget: e.target.value })}
              placeholder={isZh ? "例如：外套" : "e.g. jacket"}
              className={DIALOG_FIELD}
            />
          </label>
          <label className={DIALOG_LABEL}>
            {isZh ? "動作" : "Action"}
            <select
              value={values.objectEditMode ?? "change"}
              onChange={(e) => update({ objectEditMode: e.target.value as SwapSettings["objectEditMode"] })}
              className={DIALOG_FIELD}
            >
              {SWAP_OBJECT_EDIT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {pick(EDIT_LABELS[mode])}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {values.swapMode === "relight" ? (
        <div className={DIALOG_LABEL}>
          {isZh ? "打光風格" : "Light look"}
          <CanvasPreviewSelect
            value={values.lightLookId ?? JUTSU_LIGHT_LOOKS[0]?.id ?? ""}
            ariaLabel={isZh ? "打光風格" : "Light look"}
            options={JUTSU_LIGHT_LOOKS.map((look) => ({
              value: look.id,
              label: isZh ? look.nameZhHant : look.nameEn,
              previewUrl: look.image,
            }))}
            onChange={(lightLookId) => update({ lightLookId })}
          />
        </div>
      ) : null}

      {colorFixOnly ? null : (
        <>
          <SectionFields
            isZh={isZh}
            start={values.sectionStart}
            length={values.sectionLength}
            onChange={({ start, length }) => update({ sectionStart: start, sectionLength: length })}
          />
          <AspectRatioField isZh={isZh} value={values.aspectRatio} onChange={(aspectRatio) => update({ aspectRatio })} />
        </>
      )}

      <GradeLookField isZh={isZh} value={values.gradeLook} onChange={(gradeLook) => update({ gradeLook })} />
    </ToolSettingsShell>
  );
}
