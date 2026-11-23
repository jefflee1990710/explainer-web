import type { CanvasNode, CanvasNodeData } from "@/model/canvas";
import type { CanvasSettingsData, CanvasSettingsKind } from "@/model/canvas-settings";

// Target handle that settings edges land on. It is not a model input port.
export const SETTINGS_HANDLE = "settings";

export type SettingsTarget = { id: string; type: CanvasNode["type"]; data: CanvasNodeData };

// Fields a settings node writes over its target before the target runs.
export type SettingsPatch = Partial<Pick<CanvasNodeData, "aspectRatio" | "presetId" | "durationSeconds" | "prompt">> & {
  toolParams?: Record<string, unknown>;
};

export type SettingsResolveContext = { hasPromptWire: boolean };

export type SettingsKindDef<K extends CanvasSettingsKind = CanvasSettingsKind> = {
  kind: K;
  label: { zh: string; en: string };
  color: string;
  accepts(target: SettingsTarget): boolean;
  resolve(
    settings: Extract<CanvasSettingsData, { kind: K }>,
    target: SettingsTarget,
    ctx: SettingsResolveContext,
  ): SettingsPatch;
  changed(a: Extract<CanvasSettingsData, { kind: K }>, b: Extract<CanvasSettingsData, { kind: K }>): string[];
  defaults?(): Extract<CanvasSettingsData, { kind: K }>;
};
