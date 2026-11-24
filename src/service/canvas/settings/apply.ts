// Pure: which wired nodes a Setting edit makes old. Only targets whose prompt text uses a
// `{{key}}` whose value changed are affected.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import {
  directorHandles,
  directorRawOutput,
  isExplainerDirectorNode,
  readDirectorPlan,
} from "@/service/canvas/explainer-director";
import { settingsVars } from "@/service/canvas/settings/registry";
import { promptPlaceholders } from "@/service/canvas/settings/template";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

// Text whose `{{key}}` placeholders this node's Setting fills: a Prompt node's own text, every
// Director output, or a model's wired Prompt / Director text, else its inline prompt.
export function templateText(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[], target: CanvasNode): string {
  if (target.type === "prompt") return target.data.text ?? "";
  if (isExplainerDirectorNode(target)) {
    const plan = readDirectorPlan(target);
    return plan ? directorHandles(plan).map((h) => directorRawOutput(target, h) ?? "").join("\n") : "";
  }
  const promptWire = edges.find((e) => e.target === target.id && e.targetHandle === "prompt");
  const source = promptWire ? nodes.find((n) => n.id === promptWire.source) : undefined;
  if (source?.type === "prompt") return source.data.text ?? "";
  if (source && promptWire?.sourceHandle && isExplainerDirectorNode(source)) {
    return directorRawOutput(source, promptWire.sourceHandle) ?? "";
  }
  return target.data.prompt ?? "";
}

// Targets whose used placeholder values differ after this Setting changes to `next`.
export function settingsStaleTargets(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  settingsNodeId: string,
  next: CanvasSettingsData,
): string[] {
  const before = settingsVars(nodes.find((n) => n.id === settingsNodeId)?.data.settings);
  const after = settingsVars(next);
  return edges
    .filter((e) => e.source === settingsNodeId && e.targetHandle === SETTINGS_HANDLE)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is CanvasNode => Boolean(n))
    .filter((t) => promptPlaceholders(templateText(nodes, edges, t)).some((k) => before[k] !== after[k]))
    .map((n) => n.id);
}
