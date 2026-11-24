"use client";

// Setting node: a key-value map whose keys fill `{{key}}` in wired Director, model, or Prompt nodes.

import type { NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";
import { ToolSettingsShell } from "@/app/app/canvas/nodes/tool-settings-shell";
import { SettingsVarsEditor } from "@/app/app/canvas/nodes/settings-vars-editor";

export const SETTING_COLOR = "#c6f24b";

export function SettingsNodeCard({ id, data, selected }: NodeProps & { data: CanvasNodeData }) {
  const { locale, onUpdateNodeData } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  return (
    <ToolSettingsShell isZh={isZh} title={isZh ? "設定" : "Setting"} color={SETTING_COLOR} selected={Boolean(selected)}>
      <SettingsVarsEditor
        isZh={isZh}
        vars={data.settings?.vars}
        onChange={(vars) => onUpdateNodeData(id, { settings: { vars } })}
      />
    </ToolSettingsShell>
  );
}
