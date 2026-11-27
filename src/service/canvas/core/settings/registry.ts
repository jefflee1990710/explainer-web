// Setting nodes: a plain key-value map that fills `{{key}}` in wired text fields.

import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import type { CanvasSettingsData, SettingsVars } from "@/model/canvas-settings";
import { findCanvasModel, STATIC_CANVAS_MODELS } from "@/service/canvas/catalog/model-catalog";
import { SETTINGS_HANDLE, type SettingsTarget } from "@/service/canvas/core/settings/types";

export function settingsVars(settings: CanvasSettingsData | undefined): SettingsVars {
  return settings?.vars ?? {};
}

// A Prompt node, or any model card that has a text field the user can type into.
export function canWireSettings(
  target: SettingsTarget,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): boolean {
  if (target.type === "prompt") return true;
  if (target.type !== "model") return false;
  const modelId = target.data.modelId;
  if (!modelId) return false;
  const spec = findCanvasModel(modelId, catalog);
  if (!spec) return false;
  if (spec.inputs.some((port) => port.type === "text")) return true;
  if (spec.toolParams?.some((field) => field.kind === "string")) return true;
  // Auto captions stores an editable transcript on the node.
  return spec.output.type === "text";
}

// Drops a Setting wire whose target has no text field. Prompt wires and text-field wires stay.
export function withoutModelSettingsEdges<
  E extends { target: string; targetHandle?: string | null },
>(
  nodes: readonly { id: string; type?: string | null; data?: CanvasNodeData }[],
  edges: readonly E[],
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): { edges: E[]; dropped: boolean } {
  const next = edges.filter((edge) => {
    if (edge.targetHandle !== SETTINGS_HANDLE) return true;
    const target = nodes.find((node) => node.id === edge.target);
    if (!target?.type) return true;
    return canWireSettings({ id: target.id, type: target.type as SettingsTarget["type"], data: target.data ?? {} }, catalog);
  });
  return { edges: next, dropped: next.length !== edges.length };
}
