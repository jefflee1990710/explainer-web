// Setting nodes: a plain key-value map that fills `{{key}}` in wired prompts.

import type { CanvasSettingsData, SettingsVars } from "@/model/canvas-settings";
import type { SettingsTarget } from "@/service/canvas/settings/types";

export function settingsVars(settings: CanvasSettingsData | undefined): SettingsVars {
  return settings?.vars ?? {};
}

// Director, model, and Prompt nodes take one Setting on their `settings` handle.
export function canWireSettings(target: SettingsTarget): boolean {
  return target.type === "model" || target.type === "prompt";
}
