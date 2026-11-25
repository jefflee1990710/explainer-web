// Setting nodes: a plain key-value map that fills `{{key}}` in wired prompts.

import type { CanvasSettingsData, SettingsVars } from "@/model/canvas-settings";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import type { SettingsTarget } from "@/service/canvas/settings/types";

export function settingsVars(settings: CanvasSettingsData | undefined): SettingsVars {
  return settings?.vars ?? {};
}

// Model and Prompt nodes take one Setting on their `settings` handle.
// The Explainer Director does not: its text style is chosen on the card.
export function canWireSettings(target: SettingsTarget): boolean {
  if (target.type === "prompt") return true;
  if (target.type !== "model") return false;
  return !(
    target.data.modelId === EXPLAINER_PLANNER_MODEL_ID && target.data.toolParams?.plannerMode === true
  );
}
