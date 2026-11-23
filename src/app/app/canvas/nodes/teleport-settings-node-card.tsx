"use client";

// Teleport Settings node: section, ratio, mood, and grade for a Teleport group.
// Edits save straight to the node and apply when the wired nodes run.

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import type { TeleportSettings } from "@/model/canvas-settings";
import { settingsKindDef } from "@/service/canvas/settings/registry";
import { AspectRatioField } from "@/app/app/canvas/aspect-ratio-field";
import { SectionFields } from "@/app/app/canvas/section-fields";
import { DIALOG_LABEL, DIALOG_TEXTAREA } from "@/app/app/canvas/scro-dialog-shell";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { GradeLookField, ToolSettingsShell } from "@/app/app/canvas/nodes/tool-settings-shell";

export function TeleportSettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  if (data.settings?.kind !== "teleport") return null;
  const values = data.settings.values;
  const def = settingsKindDef("teleport");
  const update = (patch: Partial<TeleportSettings>) =>
    onUpdateNodeData(id, { settings: { kind: "teleport", values: { ...values, ...patch } } });

  return (
    <ToolSettingsShell
      isZh={isZh}
      title={isZh ? def.label.zh : def.label.en}
      color={def.color}
      selected={Boolean(selected)}
    >
      <SectionFields
        isZh={isZh}
        start={values.sectionStart}
        length={values.sectionLength}
        onChange={({ start, length }) => update({ sectionStart: start, sectionLength: length })}
      />
      <AspectRatioField isZh={isZh} value={values.aspectRatio} onChange={(aspectRatio) => update({ aspectRatio })} />
      <label className={DIALOG_LABEL}>
        {isZh ? "氛圍（選填）" : "Mood (optional)"}
        <textarea
          rows={2}
          value={values.mood ?? ""}
          onChange={(e) => update({ mood: e.target.value })}
          placeholder={isZh ? "例如：冷色霓虹雨夜" : "e.g. cold neon rain"}
          className={DIALOG_TEXTAREA}
        />
      </label>
      <GradeLookField isZh={isZh} value={values.gradeLook} onChange={(gradeLook) => update({ gradeLook })} />
    </ToolSettingsShell>
  );
}
