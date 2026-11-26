// Pure, client-safe helpers for the canvas Explainer Director look (art style, background, text, presenter).

import type { DirectorPresetBackground } from "@/model/director";
import {
  EXPLAINER_PRESENTER_POSITIONS,
  EXPLAINER_SCENE_TEXT_CHOICES,
  EXPLAINER_SKILL_SLUGS,
  type ExplainerPresenterPosition,
  type ExplainerSettings,
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

function defaultBackgroundId(skillSlug: string | undefined): string | undefined {
  if (skillSlug === "paper-cutout-explainer-video-director") return DEFAULT_PAPER_CUTOUT_BACKGROUND_ID;
  if (skillSlug === "papercraft-diorama-director") return DEFAULT_PAPERCRAFT_BACKGROUND_ID;
  return undefined;
}

// The background a Director card shows and plans with: its saved preset, else the style's default.
export function effectiveDirectorBackgroundId(skillSlug: string | undefined, id: unknown): string | undefined {
  return typeof id === "string" && explainerBackgroundPresets(skillSlug).some((bg) => bg.id === id)
    ? id
    : defaultBackgroundId(skillSlug);
}

// The background an older plan with no saved id was drawn with. Paper-cutout stills fell back to
// its default sheet; papercraft stills had no colour lock at all.
export function plannedDirectorBackgroundId(skillSlug: string | undefined, id: unknown): string | undefined {
  if (typeof id === "string" && id) return id;
  return skillSlug === "paper-cutout-explainer-video-director" ? DEFAULT_PAPER_CUTOUT_BACKGROUND_ID : undefined;
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

// Backing-video fields for a planner card; a card with no saved background plans with the style's default.
export function explainerVideoLookFields(
  tp: Record<string, unknown> | undefined,
  skillSlug: string,
  language: string,
) {
  const params = tp ?? {};
  const background = effectiveDirectorBackgroundId(skillSlug, params.directorBackgroundId);
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
