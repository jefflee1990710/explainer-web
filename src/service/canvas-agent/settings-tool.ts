// Canvas agent tool: change a Setting node's `{{key}}` vars. They apply at run time, so this
// only writes the node and marks the previews whose used values changed as old versions.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import { SETTINGS_VAR_KEY } from "@/model/canvas-settings";
import { settingsStaleTargets } from "@/service/canvas/settings/apply";
import { settingsVars } from "@/service/canvas/settings/registry";
import { markStaleOutputs } from "@/service/canvas/stale-outputs";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

export const updateSettingsSchema = z.object({
  groupId: z.string().optional().describe("Group id from get_canvas whose Setting node to change."),
  nodeId: z.string().optional().describe("Setting node id; use when it has no group."),
  vars: z
    .record(z.string(), z.string().nullable())
    .describe(
      "Key-value pairs that fill {{key}} in the prompts of wired Director, model, or Prompt nodes. Keys: letters, digits, _. A null value removes that key.",
    ),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

function pickNode(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): CanvasNode | { error: string } {
  if (input.nodeId) {
    const node = g.nodes.find((n) => n.id === input.nodeId);
    return node?.type === "settings" ? node : { error: `"${input.nodeId}" is not a Setting node.` };
  }
  const group = g.groups.find((gr) => gr.id === input.groupId);
  const node = g.nodes.find((n) => group?.memberIds.includes(n.id) && n.type === "settings");
  return node ?? { error: `Group "${input.groupId}" has no Setting node. Pass nodeId of the Setting.` };
}

export function updateSettings(g: CanvasAgentWorkingGraph, input: UpdateSettingsInput): Record<string, unknown> {
  const picked = pickNode(g, input);
  if ("error" in picked) return picked;
  const before = settingsVars(picked.data.settings);
  const vars: Record<string, string> = { ...before };
  for (const [key, value] of Object.entries(input.vars ?? {})) {
    if (!SETTINGS_VAR_KEY.test(key)) return { error: `Invalid var key "${key}": letters, digits, and _ only.` };
    if (value === null) delete vars[key];
    else vars[key] = value;
  }
  const changed = [...new Set([...Object.keys(before), ...Object.keys(vars)])].filter((k) => before[k] !== vars[k]);
  if (changed.length === 0) return { error: "These are already the Setting's values; nothing changes." };

  const next = { vars };
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
    changed: changed.map((k) => `vars.${k}`),
    note: "The new values apply when those nodes run. Tell the user to press Run group to regenerate the previews marked as old versions.",
  };
}
