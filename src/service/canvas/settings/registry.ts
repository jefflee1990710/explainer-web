// Setting nodes: a plain key-value map that fills `{{key}}` in a Prompt node's text.

import type { CanvasSettingsData, SettingsVars } from "@/model/canvas-settings";
import { SETTINGS_HANDLE, type SettingsTarget } from "@/service/canvas/settings/types";

export function settingsVars(settings: CanvasSettingsData | undefined): SettingsVars {
  return settings?.vars ?? {};
}

// Only a Prompt node takes a Setting. Model prompts get those values through the Prompt wire.
export function canWireSettings(target: SettingsTarget): boolean {
  return target.type === "prompt";
}

// Older canvases wired a Setting straight onto a model. Those wires no longer fill anything.
export function withoutModelSettingsEdges<E extends { target: string; targetHandle?: string | null }>(
  nodes: readonly { id: string; type?: string | null }[],
  edges: readonly E[],
): { edges: E[]; dropped: boolean } {
  const models = new Set(nodes.filter((node) => node.type === "model").map((node) => node.id));
  const next = edges.filter((edge) => edge.targetHandle !== SETTINGS_HANDLE || !models.has(edge.target));
  return { edges: next, dropped: next.length !== edges.length };
}
