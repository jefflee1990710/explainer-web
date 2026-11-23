// Pure: merges each wired settings node into its targets. Settings values win over the
// target's own values, which stay stored on the node as the fallback when unwired.

import type { CanvasEdge, CanvasNode, CanvasNodeData } from "@/model/canvas";
import type { CanvasSettingsData } from "@/model/canvas-settings";
import { resolveSettings } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE, type SettingsPatch } from "@/service/canvas/settings/types";

export function mergeSettingsPatch(data: CanvasNodeData, patch: SettingsPatch): CanvasNodeData {
  const { toolParams, ...rest } = patch;
  return {
    ...data,
    ...rest,
    ...(toolParams ? { toolParams: { ...(data.toolParams ?? {}), ...toolParams } } : {}),
  };
}

function patchFor(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  target: CanvasNode,
  override?: { nodeId: string; settings: CanvasSettingsData },
): SettingsPatch | undefined {
  const wire = edges.find((e) => e.target === target.id && e.targetHandle === SETTINGS_HANDLE);
  if (!wire) return undefined;
  const source = nodes.find((n) => n.id === wire.source);
  const settings = override?.nodeId === wire.source ? override.settings : source?.data.settings;
  if (source?.type !== "settings" || !settings) return undefined;
  const hasPromptWire = edges.some((e) => e.target === target.id && e.targetHandle === "prompt");
  return resolveSettings(settings, target, { hasPromptWire });
}

export function settingsOverridesById(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
): Map<string, SettingsPatch> {
  const out = new Map<string, SettingsPatch>();
  for (const node of nodes) {
    if (node.type !== "model") continue;
    const patch = patchFor(nodes, edges, node);
    if (patch && Object.keys(patch).length > 0) out.set(node.id, patch);
  }
  return out;
}

export function withWiredSettings<N extends CanvasNode>(nodes: readonly N[], edges: readonly CanvasEdge[]): N[] {
  const overrides = settingsOverridesById(nodes, edges);
  if (overrides.size === 0) return [...nodes];
  return nodes.map((n) => {
    const patch = overrides.get(n.id);
    return patch ? { ...n, data: mergeSettingsPatch(n.data, patch) } : n;
  });
}

// Targets whose merged values differ after this settings node changes to `next`.
export function settingsStaleTargets(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  settingsNodeId: string,
  next: CanvasSettingsData,
): string[] {
  const targets = edges
    .filter((e) => e.source === settingsNodeId && e.targetHandle === SETTINGS_HANDLE)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is CanvasNode => Boolean(n));
  return targets
    .filter((target) => {
      const before = patchFor(nodes, edges, target);
      const after = patchFor(nodes, edges, target, { nodeId: settingsNodeId, settings: next });
      return JSON.stringify(before ?? {}) !== JSON.stringify(after ?? {});
    })
    .map((n) => n.id);
}
