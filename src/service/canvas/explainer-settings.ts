// Pure, client-safe helpers for the canvas Explainer Settings node.

import { explainerSettingsPatch } from "@/service/canvas/settings/explainer-data";
import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import type { DirectorPresetBackground } from "@/model/director";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
  type ExplainerPresenterPosition,
  type ExplainerSettings,
  type ExplainerSettingsNodeData,
  type ExplainerSkillSlug,
} from "@/model/explainer-settings";
import {
  DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
  PAPER_CUTOUT_PRESET_BACKGROUNDS,
} from "@/model/paper-cutout-backgrounds";
import {
  DEFAULT_PAPERCRAFT_BACKGROUND_ID,
  PAPERCRAFT_PRESET_BACKGROUNDS,
} from "@/model/papercraft-backgrounds";
import type { SceneTextChoice } from "@/model/project";
import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";
import { EXPLAINER_PLANNER_MODEL_ID } from "@/service/canvas/explainer-planner";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

// Frame target handle the settings edges land on. It is not a model input.
export const EXPLAINER_SETTINGS_HANDLE = SETTINGS_HANDLE;

// Marker lines the plan source uses; everything from the first marker on is not the topic.
const PRESENTER_MARKER = "【版面】";
const NARRATION_MARKER = "【保留旁白】";

const PRESENTER_LINE: Record<Exclude<ExplainerPresenterPosition, "auto">, string> = {
  "lower-left":
    "Presenter position: in every clip the character stays in the lower-left presenter zone and the diagram fills the rest of the frame.",
  "lower-right":
    "Presenter position: in every clip the character stays in the lower-right presenter zone and the diagram fills the rest of the frame.",
};

const DEFAULT_SETTINGS: ExplainerSettings = {
  skillSlug: "cartoon-explainer-video-director",
  textStyleId: "handwritten",
  sceneTextLanguage: "zh-Hant",
  presenterPosition: "auto",
};

function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function explainerBackgroundPresets(skillSlug: string | undefined): readonly DirectorPresetBackground[] {
  if (skillSlug === "paper-cutout-explainer-video-director") return PAPER_CUTOUT_PRESET_BACKGROUNDS;
  if (skillSlug === "papercraft-diorama-director") return PAPERCRAFT_PRESET_BACKGROUNDS;
  return [];
}

function defaultBackgroundId(skillSlug: ExplainerSkillSlug): string | undefined {
  if (skillSlug === "paper-cutout-explainer-video-director") return DEFAULT_PAPER_CUTOUT_BACKGROUND_ID;
  if (skillSlug === "papercraft-diorama-director") return DEFAULT_PAPERCRAFT_BACKGROUND_ID;
  return undefined;
}

// Fills defaults and drops a background the chosen director does not offer.
export function normalizeExplainerSettings(raw: Partial<Record<keyof ExplainerSettings, unknown>>): ExplainerSettings {
  const skillSlug = oneOf(EXPLAINER_SKILL_SLUGS, raw.skillSlug) ?? DEFAULT_SETTINGS.skillSlug;
  const presets = explainerBackgroundPresets(skillSlug);
  const backgroundId =
    typeof raw.backgroundId === "string" && presets.some((bg) => bg.id === raw.backgroundId)
      ? raw.backgroundId
      : defaultBackgroundId(skillSlug);
  return {
    skillSlug,
    ...(backgroundId ? { backgroundId } : {}),
    textStyleId: oneOf<SubtitleLook>(SUBTITLE_LOOK_IDS, raw.textStyleId) ?? DEFAULT_SETTINGS.textStyleId,
    sceneTextLanguage:
      oneOf<SceneTextChoice>(EXPLAINER_SCENE_TEXT_CHOICES, raw.sceneTextLanguage) ?? DEFAULT_SETTINGS.sceneTextLanguage,
    presenterPosition:
      oneOf(EXPLAINER_PRESENTER_POSITIONS, raw.presenterPosition) ?? DEFAULT_SETTINGS.presenterPosition,
  };
}

// Only the text style is applied at frame time; every other field is written into Phase A scenes.
export function explainerSettingsChanges(a: ExplainerSettings, b: ExplainerSettings) {
  const keys: (keyof ExplainerSettings)[] = [
    "skillSlug",
    "backgroundId",
    "textStyleId",
    "sceneTextLanguage",
    "presenterPosition",
  ];
  const changed = keys.filter((key) => a[key] !== b[key]);
  return { changed, restyleOnly: changed.length > 0 && changed.every((key) => key === "textStyleId") };
}

export function composeExplainerPlanSource(input: {
  topic: string;
  presenterPosition: ExplainerPresenterPosition;
  narration: readonly string[];
}): string {
  const parts = [input.topic.trim()];
  if (input.presenterPosition !== "auto") {
    parts.push(`${PRESENTER_MARKER}\n${PRESENTER_LINE[input.presenterPosition]}`);
  }
  const lines = input.narration.map((line) => line.trim()).filter(Boolean);
  if (lines.length > 0) {
    parts.push(
      `${NARRATION_MARKER}\nKeep each voiceover line below word for word, one per clip in this order, and redesign only the visuals:\n${lines
        .map((line, i) => `${i + 1}. ${line}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

export function topicFromPlanSource(source: string): string {
  const cut = [PRESENTER_MARKER, NARRATION_MARKER]
    .map((marker) => source.indexOf(marker))
    .filter((i) => i >= 0);
  return (cut.length > 0 ? source.slice(0, Math.min(...cut)) : source).trim();
}

function presenterFromPlanSource(source: string | undefined): ExplainerPresenterPosition {
  if (!source) return "auto";
  if (source.includes(PRESENTER_LINE["lower-left"])) return "lower-left";
  if (source.includes(PRESENTER_LINE["lower-right"])) return "lower-right";
  return "auto";
}

// Planner card toolParams that createCanvasDirectorVideo reads.
export function explainerSettingsToolParams(s: ExplainerSettings): Record<string, unknown> {
  return {
    skillSlug: s.skillSlug,
    ...(s.backgroundId ? { directorBackgroundId: s.backgroundId } : {}),
    textStyleId: s.textStyleId,
    sceneTextLanguage: s.sceneTextLanguage,
    presenterPosition: s.presenterPosition,
  };
}

export function explainerSettingsFromToolParams(tp: Record<string, unknown> | undefined): ExplainerSettings {
  const params = tp ?? {};
  return normalizeExplainerSettings({
    skillSlug: params.skillSlug,
    backgroundId: params.directorBackgroundId,
    textStyleId: params.textStyleId,
    sceneTextLanguage: params.sceneTextLanguage,
    presenterPosition: params.presenterPosition,
  });
}

// Backing-video fields for a planner card; cards without settings keep the old defaults.
export function explainerVideoLookFields(
  tp: Record<string, unknown> | undefined,
  skillSlug: string,
  language: string,
) {
  const params = tp ?? {};
  const background =
    typeof params.directorBackgroundId === "string" &&
    explainerBackgroundPresets(skillSlug).some((bg) => bg.id === params.directorBackgroundId)
      ? params.directorBackgroundId
      : undefined;
  const look = oneOf<SubtitleLook>(SUBTITLE_LOOK_IDS, params.textStyleId);
  const sceneText = oneOf<SceneTextChoice>(EXPLAINER_SCENE_TEXT_CHOICES, params.sceneTextLanguage);
  const defaultScript = language === "en" ? "en" : "zh-Hant";
  return {
    ...(background ? { directorBackgroundId: background } : {}),
    subtitleLook: look ?? "handwritten",
    textStyleId: look ?? "handwritten",
    ...(look ? { onScreenTextStyleId: look } : {}),
    sceneTextEnabled: sceneText !== "none",
    sceneTextLanguage: sceneText && sceneText !== "none" ? sceneText : defaultScript,
  } as const;
}

export type ExplainerSettingsVideoFields = {
  skillSlug?: string;
  directorBackgroundId?: string;
  onScreenTextStyleId?: string;
  textStyleId?: string;
  subtitleLook?: string;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: string;
  source?: string;
};

export function explainerSettingsFromVideo(video: ExplainerSettingsVideoFields): ExplainerSettings {
  return normalizeExplainerSettings({
    skillSlug: video.skillSlug,
    backgroundId: video.directorBackgroundId,
    textStyleId: video.onScreenTextStyleId || video.textStyleId || video.subtitleLook,
    sceneTextLanguage: video.sceneTextEnabled === false ? "none" : video.sceneTextLanguage,
    presenterPosition: presenterFromPlanSource(video.source),
  });
}

export function explainerSettingsNodeId(groupId: string): string {
  return `${groupId}-settings`;
}

export function buildExplainerSettingsNode(input: {
  groupId: string;
  position: { x: number; y: number };
  data: ExplainerSettingsNodeData;
}): CanvasNode {
  return {
    id: explainerSettingsNodeId(input.groupId),
    type: "settings",
    position: input.position,
    data: { label: "解說設定", ...explainerSettingsPatch(input.data) },
  };
}

export function explainerSettingsEdges(groupId: string, frameIds: readonly string[]): CanvasEdge[] {
  const source = explainerSettingsNodeId(groupId);
  return frameIds.map((target) => ({
    id: `${source}->${target}:${EXPLAINER_SETTINGS_HANDLE}`,
    source,
    sourceHandle: "output",
    target,
    targetHandle: EXPLAINER_SETTINGS_HANDLE,
  }));
}

// Voice lines of the group's clips, in clip order.
function groupNarration(nodes: readonly CanvasNode[], groupId: string): string[] {
  const pattern = new RegExp(`^${groupId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-voice-(\\d+)$`);
  return nodes
    .map((n) => ({ n, match: pattern.exec(n.id) }))
    .filter((x): x is { n: CanvasNode; match: RegExpExecArray } => Boolean(x.match))
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.n.data.prompt?.trim() ?? "")
    .filter(Boolean);
}

// Planning card that re-plans the group with new settings, keeping topic, narration, and character.
export function buildExplainerReplanCard(input: {
  nodes: readonly CanvasNode[];
  group: CanvasGroup;
  settings: ExplainerSettingsNodeData;
  next: ExplainerSettings;
  cardId: string;
  position: { x: number; y: number };
}): CanvasNode {
  const params = input.group.params ?? {};
  const aspectRatio =
    params.aspectRatio ??
    input.nodes.find((n) => input.group.memberIds.includes(n.id) && n.data.aspectRatio)?.data.aspectRatio ??
    "9:16";
  return {
    id: input.cardId,
    type: "model",
    position: input.position,
    data: {
      modelId: EXPLAINER_PLANNER_MODEL_ID,
      aspectRatio,
      prompt: composeExplainerPlanSource({
        topic: input.settings.topic,
        presenterPosition: input.next.presenterPosition,
        narration: groupNarration(input.nodes, input.group.id),
      }),
      toolParams: {
        plannerMode: true,
        ...(params.characterId ? { characterId: params.characterId } : {}),
        ...(params.language ? { language: params.language } : {}),
        ...(params.durationPreset ? { durationPreset: params.durationPreset } : {}),
        ...explainerSettingsToolParams(input.next),
      },
      status: "idle",
    },
  };
}
