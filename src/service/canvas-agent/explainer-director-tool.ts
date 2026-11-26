// Canvas agent tool: change an Explainer Director's topic or look. A text style change applies at
// run time; anything else sets replanRequested so the canvas replans for free after the reply.

import { z } from "zod";
import type { CanvasAspectRatio, CanvasNode } from "@/model/canvas";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
} from "@/model/explainer-settings";
import { SUBTITLE_LOOK_IDS } from "@/model/subtitle-look-id";
import { explainerBackgroundPresets } from "@/service/canvas/directors/explainer-settings";
import { directorChangedTargets, isExplainerDirectorNode } from "@/service/canvas/directors/explainer-director";
import { markStaleOutputs } from "@/service/canvas/core/stale-outputs";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";

type Result = Record<string, unknown>;

// "slug: id (name), ..." so the model picks exact preset ids.
function backgroundCatalog(): string {
  return EXPLAINER_SKILL_SLUGS.map((slug) => {
    const presets = explainerBackgroundPresets(slug);
    return `${slug}: ${presets.length ? presets.map((bg) => `${bg.id} (${bg.nameEn})`).join(", ") : "no background choice"}`;
  }).join("; ");
}

export const updateExplainerSettingsSchema = z.object({
  groupId: z.string().optional().describe("Explainer group id; needed only when the canvas has several Explainer Directors."),
  topic: z.string().optional().describe("New topic or full script. A new topic writes new voiceover."),
  artStyle: z.enum(EXPLAINER_SKILL_SLUGS).optional().describe("Director style. Changing it replans."),
  background: z.string().optional().describe(`Preset background id for the art style. ${backgroundCatalog()}`),
  textStyle: z.enum(SUBTITLE_LOOK_IDS).optional().describe("On-screen lettering look. Applies without a replan."),
  textLanguage: z.enum(EXPLAINER_SCENE_TEXT_CHOICES).optional().describe('On-screen text script, or "none" for no text.'),
  presenter: z.enum(EXPLAINER_PRESENTER_POSITIONS).optional().describe("Where the character stands in every clip."),
});

export type UpdateExplainerSettingsInput = z.infer<typeof updateExplainerSettingsSchema>;

// Fields replace_group may also change on the Director.
export type DirectorExtraParams = {
  directorId?: string;
  characterId?: string;
  language?: string;
  durationPreset?: string;
  aspectRatio?: CanvasAspectRatio;
  // replace_group always replans, even when nothing else changed.
  forceReplan?: boolean;
};

const REPLAN_KEYS = [
  "skillSlug",
  "directorBackgroundId",
  "sceneTextLanguage",
  "presenterPosition",
  "characterId",
  "language",
  "durationPreset",
] as const;

export function pickExplainerDirector(g: CanvasAgentWorkingGraph, groupId?: string): CanvasNode | { error: string } {
  const all = g.nodes.filter(isExplainerDirectorNode);
  if (groupId) {
    const group = g.groups.find((gr) => gr.id === groupId);
    const node = all.find((n) => group?.memberIds.includes(n.id));
    return node ?? { error: `Group "${groupId}" has no Explainer Director. Read groups from get_canvas.` };
  }
  if (all.length === 1) return all[0]!;
  if (all.length === 0) return { error: "No Explainer Director on the canvas. Add scro:explainer with add_model_node first." };
  const names = all.map((n) => g.groups.find((gr) => gr.memberIds.includes(n.id))?.id ?? n.id);
  return { error: `Several Explainer Directors are on the canvas (${names.join(", ")}). Pass groupId.` };
}

export function updateExplainerDirector(
  g: CanvasAgentWorkingGraph,
  input: UpdateExplainerSettingsInput,
  extra: DirectorExtraParams = {},
): Result {
  const byId = extra.directorId ? g.nodes.find((n) => n.id === extra.directorId) : undefined;
  const picked = byId && isExplainerDirectorNode(byId) ? byId : pickExplainerDirector(g, input.groupId);
  if ("error" in picked) return picked;
  if (picked.data.toolParams?.planStatus === "planning") {
    return { error: "This Explainer is planning right now; wait until it finishes." };
  }
  const tp = picked.data.toolParams ?? {};
  const skillSlug = input.artStyle ?? String(tp.skillSlug ?? "cartoon-explainer-video-director");
  if (input.background && !explainerBackgroundPresets(skillSlug).some((bg) => bg.id === input.background)) {
    return { error: `Background "${input.background}" is not offered. Choose from ${backgroundCatalog()}.` };
  }
  // A new art style without a background falls back to that style's default.
  const styleChanged = Boolean(input.artStyle && input.artStyle !== tp.skillSlug);
  const nextTp: Record<string, unknown> = {
    ...tp,
    skillSlug,
    ...(styleChanged && !input.background ? { directorBackgroundId: undefined } : {}),
    ...(input.background ? { directorBackgroundId: input.background } : {}),
    ...(input.textStyle ? { textStyleId: input.textStyle } : {}),
    ...(input.textLanguage ? { sceneTextLanguage: input.textLanguage } : {}),
    ...(input.presenter ? { presenterPosition: input.presenter } : {}),
    ...(extra.characterId ? { characterId: extra.characterId } : {}),
    ...(extra.language ? { language: extra.language } : {}),
    ...(extra.durationPreset ? { durationPreset: extra.durationPreset } : {}),
  };
  const topic = input.topic?.trim();
  const topicChanged = Boolean(topic && topic !== (picked.data.prompt ?? "").trim());
  const ratioChanged = Boolean(extra.aspectRatio && extra.aspectRatio !== picked.data.aspectRatio);
  const replan =
    Boolean(extra.forceReplan) || topicChanged || ratioChanged || REPLAN_KEYS.some((k) => nextTp[k] !== tp[k]);
  const restyled = nextTp.textStyleId !== tp.textStyleId;
  if (!replan && !restyled) return { error: "These are already the Explainer's settings; nothing changes." };
  if (replan) nextTp.replanRequested = true;

  const patch = {
    ...(topicChanged ? { prompt: topic } : {}),
    ...(ratioChanged ? { aspectRatio: extra.aspectRatio } : {}),
    toolParams: nextTp,
  };
  const after: CanvasNode = { ...picked, data: { ...picked.data, ...patch } };
  g.nodes = g.nodes.map((n) => (n.id === picked.id ? after : n));
  g.ops.push({ kind: "update_node", nodeId: picked.id, patch });
  if (!replan) {
    const stale = markStaleOutputs(g.nodes, g.edges, directorChangedTargets(picked, after, g.edges));
    if (stale.staleIds.length > 0) {
      g.nodes = stale.nodes;
      g.ops.push({ kind: "mark_stale", nodeIds: stale.staleIds });
    }
  }
  return {
    ok: true,
    directorId: picked.id,
    replan,
    note: replan
      ? "After your reply the canvas replans this Explainer for free (about 1–3 minutes) and updates the Director's outputs in place; the voiceover stays word for word unless the topic changed. Tell the user to press Run group when it finishes. Do not edit frame prompts yourself."
      : "The new text style applies when the stills run. Tell the user to press Run group.",
  };
}
