import { isDurationPreset } from "@/service/director/duration-presets";
import { isVoLanguage } from "@/service/director/languages";
import { isSceneTextLanguage } from "@/service/director/scene-text";
import { isSpeechPace } from "@/service/director/speech-pace";
import { requiredCastCount } from "@/service/director/skill-rules";
import { isVoiceGender } from "@/service/director/voice";
import { DEFAULT_STYLE_ID, isStyleId, type StyleId } from "@/service/style";
import type {
  AspectRatio,
  DurationPreset,
  SceneTextLanguage,
  SpeechPace,
  VoLanguage,
  VoiceGender,
} from "@/model/project";

export type BriefDefaults = {
  skillSlug: string;
  styleId: StyleId;
  language: VoLanguage;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextLanguage: SceneTextLanguage;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  characterIds: string[];
};

type Catalog = {
  skills: Array<{ slug: string; behaviorSlug?: string }>;
  styles: Array<{ id: StyleId }>;
  characters: Array<{ id: string; styleId: StyleId }>;
};

const RATIOS = new Set<AspectRatio>(["16:9", "9:16", "1:1"]);

function storageKey(projectId: string) {
  return `explainer:brief-defaults:${projectId}`;
}

// Last 新增影片 choices for this folder. Never stores 題材或腳本.
export function sanitizeBriefDefaults(
  raw: unknown,
  catalog: Catalog,
): BriefDefaults | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const skillSlug =
    typeof input.skillSlug === "string" && catalog.skills.some((skill) => skill.slug === input.skillSlug)
      ? input.skillSlug
      : catalog.skills[0]?.slug;
  if (!skillSlug) return undefined;
  const styleId =
    typeof input.styleId === "string" &&
    isStyleId(input.styleId) &&
    catalog.styles.some((style) => style.id === input.styleId)
      ? input.styleId
      : catalog.styles[0]?.id || DEFAULT_STYLE_ID;
  const language = typeof input.language === "string" && isVoLanguage(input.language) ? input.language : "en";
  const voiceGender =
    typeof input.voiceGender === "string" && isVoiceGender(input.voiceGender) ? input.voiceGender : "male";
  const speechPace =
    typeof input.speechPace === "string" && isSpeechPace(input.speechPace) ? input.speechPace : "medium";
  const sceneTextLanguage =
    typeof input.sceneTextLanguage === "string" && isSceneTextLanguage(input.sceneTextLanguage)
      ? input.sceneTextLanguage
      : "en";
  const aspectRatio =
    typeof input.aspectRatio === "string" && RATIOS.has(input.aspectRatio as AspectRatio)
      ? (input.aspectRatio as AspectRatio)
      : undefined;
  const durationPreset =
    typeof input.durationPreset === "string" && isDurationPreset(input.durationPreset)
      ? input.durationPreset
      : "auto";
  if (!aspectRatio) return undefined;
  const behavior = catalog.skills.find((skill) => skill.slug === skillSlug)?.behaviorSlug || skillSlug;
  const need = requiredCastCount(behavior);
  const characterIds = (Array.isArray(input.characterIds) ? input.characterIds : [])
    .filter((id): id is string => typeof id === "string")
    .filter((id) => catalog.characters.some((character) => character.id === id && character.styleId === styleId));
  return {
    skillSlug,
    styleId,
    language,
    voiceGender,
    speechPace,
    sceneTextLanguage,
    aspectRatio,
    durationPreset,
    characterIds: need > 0 ? characterIds.slice(0, need) : characterIds.slice(0, 4),
  };
}

export function readBriefDefaults(projectId: string, catalog: Catalog): BriefDefaults | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    return sanitizeBriefDefaults(raw ? JSON.parse(raw) : null, catalog);
  } catch {
    return undefined;
  }
}

export function writeBriefDefaults(projectId: string, defaults: BriefDefaults) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(defaults));
  } catch {
    // Private mode or a full quota should not block the form.
  }
}
