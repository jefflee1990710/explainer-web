// Canvas agent tool: change an Explainer's look through its Explainer Settings node.
// It only writes `pending`; the client applies it after replay, exactly like the Apply button.

import { z } from "zod";
import type { CanvasNode } from "@/model/canvas";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
  type ExplainerSettings,
} from "@/model/explainer-settings";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";
import {
  explainerBackgroundPresets,
  explainerSettingsChanges,
  normalizeExplainerSettings,
} from "@/service/canvas/explainer-settings";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/tools";

type Result = Record<string, unknown>;

// "slug: id (name), ..." so the model picks exact preset ids.
function backgroundCatalog(): string {
  return EXPLAINER_SKILL_SLUGS.map((slug) => {
    const presets = explainerBackgroundPresets(slug);
    return `${slug}: ${presets.length ? presets.map((bg) => `${bg.id} (${bg.nameEn})`).join(", ") : "no background choice"}`;
  }).join("; ");
}

export const updateExplainerSettingsSchema = z.object({
  groupId: z.string().optional().describe("Explainer group id; needed only when the canvas has several."),
  artStyle: z.enum(EXPLAINER_SKILL_SLUGS).optional().describe("Director style. Changing it re-plans the Explainer."),
  background: z.string().optional().describe(`Preset background id for the art style. ${backgroundCatalog()}`),
  textStyle: z.enum(SUBTITLE_LOOK_IDS).optional().describe("On-screen lettering look."),
  textLanguage: z.enum(EXPLAINER_SCENE_TEXT_CHOICES).optional().describe('On-screen text script, or "none" for no text.'),
  presenter: z.enum(EXPLAINER_PRESENTER_POSITIONS).optional().describe("Where the character stands in every clip."),
});

export type UpdateExplainerSettingsInput = z.infer<typeof updateExplainerSettingsSchema>;

function settingsNodes(g: CanvasAgentWorkingGraph): CanvasNode[] {
  return g.nodes.filter((n) => n.type === "settings" && n.data.explainerSettings);
}

function pickSettingsNode(g: CanvasAgentWorkingGraph, groupId?: string): CanvasNode | { error: string } {
  const all = settingsNodes(g);
  if (groupId) {
    const group = g.groups.find((gr) => gr.id === groupId);
    const node = all.find((n) => group?.memberIds.includes(n.id));
    return node ?? { error: `Group "${groupId}" has no Explainer Settings node. Read groups from get_canvas.` };
  }
  if (all.length === 1) return all[0]!;
  if (all.length === 0) return { error: "No Explainer Settings node on the canvas. Only expanded Explainer groups have one." };
  const groups = all.map((n) => g.groups.find((gr) => gr.memberIds.includes(n.id))?.id ?? n.id);
  return { error: `Several Explainers are on the canvas (${groups.join(", ")}). Pass groupId.` };
}

export function updateExplainerSettings(g: CanvasAgentWorkingGraph, input: UpdateExplainerSettingsInput): Result {
  const picked = pickSettingsNode(g, input.groupId);
  if ("error" in picked) return picked;
  const data = picked.data.explainerSettings!;
  const group = g.groups.find((gr) => gr.memberIds.includes(picked.id));
  const busy = g.nodes.filter(
    (n) => group?.memberIds.includes(n.id) && (n.data.status === "queued" || n.data.status === "running"),
  );
  if (busy.length > 0) {
    return { error: `Node(s) ${busy.map((n) => n.id).join(", ")} are generating right now; wait until they finish.` };
  }

  const base = data.pending ?? data.applied;
  const skillSlug = input.artStyle ?? base.skillSlug;
  if (input.background && !explainerBackgroundPresets(skillSlug).some((bg) => bg.id === input.background)) {
    return { error: `Background "${input.background}" is not offered. Choose from ${backgroundCatalog()}.` };
  }
  const next: ExplainerSettings = normalizeExplainerSettings({
    ...base,
    skillSlug,
    // A new art style without a background falls back to that director's default.
    backgroundId: input.background ?? (input.artStyle && input.artStyle !== base.skillSlug ? undefined : base.backgroundId),
    ...(input.textStyle ? { textStyleId: input.textStyle } : {}),
    ...(input.textLanguage ? { sceneTextLanguage: input.textLanguage } : {}),
    ...(input.presenter ? { presenterPosition: input.presenter } : {}),
  });
  const { changed, restyleOnly } = explainerSettingsChanges(data.applied, next);
  if (changed.length === 0) return { error: "These are already the Explainer's settings; nothing changes." };

  const patch = { explainerSettings: { ...data, pending: next } };
  picked.data = { ...picked.data, ...patch };
  g.ops.push({ kind: "update_node", nodeId: picked.id, patch });
  return {
    ok: true,
    settingsNodeId: picked.id,
    changed,
    note: restyleOnly
      ? "After your reply the canvas rebuilds every start-still prompt with the new text style (free) and clears those previews. Tell the user to press Run group."
      : "After your reply the canvas re-plans this Explainer for free with the same topic and voiceover lines; it becomes a new group in about 1–2 minutes. Tell the user to press Run group when the rows appear. Do not edit frame prompts yourself.",
  };
}
