// Pure: which wired nodes a Setting edit makes old. Only targets whose prompt text uses a
// `{{key}}` whose value changed are affected.

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import {
  directorRawOutput,
  isPlanDirectorNode,
} from "@/service/canvas/directors/explainer-director";
import { settingsTexts } from "@/service/canvas/core/settings/fill";
import { canWireSettings, settingsVars } from "@/service/canvas/core/settings/registry";
import { promptPlaceholders } from "@/service/canvas/core/settings/template";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";

// Text whose `{{key}}` this node's Setting fills: its own fields, or the wired Prompt / Director line.
export function templateText(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[], target: CanvasNode): string {
  if (target.type === "prompt" || isPlanDirectorNode(target)) return settingsTexts(target).join("\n");
  const promptWire = edges.find((e) => e.target === target.id && e.targetHandle === "prompt");
  const source = promptWire ? nodes.find((n) => n.id === promptWire.source) : undefined;
  const primary = source?.type === "prompt"
    ? (source.data.text ?? "")
    : source && promptWire?.sourceHandle && isPlanDirectorNode(source)
      ? (directorRawOutput(source, promptWire.sourceHandle) ?? "")
      : (target.data.prompt ?? "");
  const extras = settingsTexts(target).filter((text) => text !== (target.data.prompt ?? ""));
  return [primary, ...extras].join("\n");
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
    .filter((n): n is CanvasNode => Boolean(n && canWireSettings(n)))
    .filter((t) => promptPlaceholders(templateText(nodes, edges, t)).some((k) => before[k] !== after[k]))
    .map((n) => n.id);
}
