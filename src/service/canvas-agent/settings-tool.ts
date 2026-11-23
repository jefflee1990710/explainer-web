// Canvas agent tool: change a Swap or Teleport group's settings node. The new values apply
// at run time, so this only writes the node and marks the affected previews as old versions.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import {
  type CanvasSettingsData,
  swapSettingsSchema,
  teleportSettingsSchema,
} from "@/model/canvas-settings";
import { settingsOverridesById, settingsStaleTargets } from "@/service/canvas/settings/apply";
import { settingsChangedKeys } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { markStaleOutputs } from "@/service/canvas/stale-outputs";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

export const updateSettingsSchema = z.object({
  groupId: z.string().optional().describe("Swap or Teleport group id from get_canvas."),
  nodeId: z.string().optional().describe("Settings node id; use when it has no group."),
  values: z
    .record(z.string(), z.unknown())
    .describe(
      "Only the keys to change. Swap: swapMode (character|object|relight|colorfix), objectTarget, objectEditMode (change|add|remove), lightLookId, sectionStart, sectionLength (2-15), aspectRatio, gradeLook (jutsu|talking-head|talking-head-selfie). Teleport: sectionStart, sectionLength (2-15), aspectRatio, mood, gradeLook.",
    ),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

const isToolSettings = (n: CanvasNode) =>
  n.type === "settings" && (n.data.settings?.kind === "swap" || n.data.settings?.kind === "teleport");

function pickNode(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): CanvasNode | { error: string } {
  if (input.nodeId) {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    return node && isToolSettings(node) ? node : { error: `"${input.nodeId}" is not a Swap or Teleport settings node.` };
  }
  const group = g.groups.find((gr) => gr.id === input.groupId);
  const node = g.nodes.find((n) => group?.memberIds.includes(n.id) && isToolSettings(n));
  return (
    node ?? {
      error: `Group "${input.groupId}" has no Swap or Teleport settings node. Explainer looks use update_explainer_settings.`,
    }
  );
}

export function updateSettings(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): Record<string, unknown> {
  const picked = pickNode(g, input);
  if ("error" in picked) return picked;
  const current = picked.data.settings;
  if (!current || current.kind === "explainer") return { error: "Use update_explainer_settings for Explainer settings." };

  const schema = current.kind === "swap" ? swapSettingsSchema : teleportSettingsSchema;
  const parsed = schema.safeParse({ ...current.values, ...input.values });
  if (!parsed.success) {
    return { error: `Invalid settings: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` };
  }
  const next = { kind: current.kind, values: parsed.data } as CanvasSettingsData;
  if (current.kind === "swap" && next.kind === "swap") {
    // Color fix has no render step, so switching to or from it needs a new Swap group.
    const rendersVideo = g.edges.some(
      (e) =>
        e.source === picked.id &&
        e.targetHandle === SETTINGS_HANDLE &&
        g.nodes.find((n) => n.id === e.target)?.data.modelId === "scro:swap-render",
    );
    if (rendersVideo ? next.values.swapMode === "colorfix" : current.values.swapMode === "colorfix" && next.values.swapMode !== "colorfix") {
      return { error: "Switching to or from color fix changes the group's steps; delete the group and add a new Swap group instead." };
    }
  }
  const changed = settingsChangedKeys(current, next);
  if (changed.length === 0) return { error: "These are already the settings; nothing changes." };

  const targets = settingsStaleTargets(g.nodes, g.edges, picked.id, next);
  const patch = { settings: next };
  picked.data = { ...picked.data, ...patch };
  g.ops.push({ kind: "update_node", nodeId: picked.id, patch });
  const stale = markStaleOutputs(g.nodes, g.edges, targets);
  if (stale.staleIds.length > 0) {
    g.nodes = stale.nodes;
    g.ops.push({ kind: "mark_stale", nodeIds: stale.staleIds });
  }
  return {
    ok: true,
    settingsNodeId: picked.id,
    changed,
    note: "The new settings apply when those nodes run. Tell the user to press Run group to regenerate the previews marked as old versions.",
  };
}

// Fields a wired settings node controls on this node; editing them directly would be overwritten at run time.
export function settingsControlledFields(g: CanvasAgentWorkingGraph, nodeId: string): Set<string> {
  const patch = settingsOverridesById(g.nodes, g.edges).get(nodeId);
  const fields = new Set<string>();
  if (!patch) return fields;
  for (const key of ["aspectRatio", "durationSeconds", "prompt"] as const) if (patch[key] !== undefined) fields.add(key);
  for (const key of Object.keys(patch.toolParams ?? {})) fields.add(`toolParams.${key}`);
  return fields;
}
