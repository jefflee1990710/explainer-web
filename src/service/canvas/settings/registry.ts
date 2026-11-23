// Settings node kinds and helpers to read or write each kind's data.

import type { CanvasNodeData } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";

export function explainerSettingsOf(data: CanvasNodeData): ExplainerSettingsNodeData | undefined {
  if (data.settings?.kind !== "explainer") return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { kind: _kind, ...rest } = data.settings;
  return rest;
}

export function explainerSettingsPatch(next: ExplainerSettingsNodeData): Pick<CanvasNodeData, "settings"> {
  return { settings: { kind: "explainer", ...next } };
}
