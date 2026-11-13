import { isDurationPreset } from "@/service/director/duration-presets";
import { isVoLanguage } from "@/service/director/languages";
import { isSceneTextChoice } from "@/service/director/scene-text";
import { isSubtitleLook, resolveSubtitleLook } from "@/service/director/subtitle-look";
import { isSpeechPace } from "@/service/director/speech-pace";
import {
  isPapercraftDioramaSkill,
  requiredCastCount,
  STORY_SHORT_SKILL_SLUG,
} from "@/service/director/skill-rules";
import { isVoiceGender } from "@/service/director/voice";
import { pickerDefaultStyleId } from "@/service/style";
import {
  isVideoQualityTier,
  type AspectRatio,
  type DurationPreset,
  type SceneTextChoice,
  type SpeechPace,
  type SubtitleLook,
  type VideoQualityTier,
  type VoLanguage,
  type VoiceGender,
} from "@/model/project";

export const DEFAULT_VIDEO_QUALITY_TIER_STORAGE_KEY = "scro:default-video-quality-tier";
// Last cast the user picked, shared by Story, Explainer, Talking, Simple, Life, and Poster.
export const LAST_CHARACTER_IDS_STORAGE_KEY = "scro:last-character-ids";

export function parseLastCharacterIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
    return [...new Set(ids)].slice(0, 4);
  } catch {
    return [];
  }
}

export function readLastCharacterIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLastCharacterIds(window.localStorage.getItem(LAST_CHARACTER_IDS_STORAGE_KEY));
  } catch {
    return [];
  }
}

// First remembered character that still exists and, when a style is set, can wear it.
export function preferredCharacterId(
  characters: ReadonlyArray<{
    id: string;
    styleId?: string;
    styleIds?: readonly string[];
    previewUrl?: string | null;
  }>,
  styleId?: string,
): string | undefined {
  return readLastCharacterIds().find((id) => {
    const character = characters.find((item) => item.id === id);
    if (!character) return false;
    if ("previewUrl" in character && !character.previewUrl) return false;
    if (!styleId) return true;
    const styles = character.styleIds?.length
      ? character.styleIds
      : character.styleId
        ? [character.styleId]
        : [];
    return styles.includes(styleId);
  });
}

export function writeLastCharacterIds(ids: readonly string[]) {
  if (typeof window === "undefined") return;
  const next = [...new Set(ids.filter((id) => id.length > 0))].slice(0, 4);
  if (next.length === 0) return;
  try {
    window.localStorage.setItem(LAST_CHARACTER_IDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota should not block the form.
  }
}

export function resolveDefaultVideoQualityTier(stored?: string | null): VideoQualityTier {
  if (isVideoQualityTier(stored)) return stored;
  return "2k_cinema";
}

export function readDefaultVideoQualityTier(): VideoQualityTier {
  if (typeof window === "undefined") return "2k_cinema";
  try {
    return resolveDefaultVideoQualityTier(
      window.localStorage.getItem(DEFAULT_VIDEO_QUALITY_TIER_STORAGE_KEY),
    );
  } catch {
    return "2k_cinema";
  }
}

export function writeDefaultVideoQualityTier(tier: VideoQualityTier) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEFAULT_VIDEO_QUALITY_TIER_STORAGE_KEY, tier);
  } catch {
    // Ignore storage quota errors
  }
}

export type BriefDefaults = {
  skillSlug: string;
  styleId: string;
  language: VoLanguage;
  languageExplicit?: boolean;
  narrationEnabled?: boolean;
  voiceGender: VoiceGender;
  speechPace: SpeechPace;
  sceneTextLanguage: SceneTextChoice;
  subtitleLook: SubtitleLook;
  textStyleId: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  characterIds: string[];
};

// Map the UI locale to the most natural default voiceover language for new videos.
// Traditional Chinese (zh-Hant) defaults to Hong Kong Cantonese ("yue").
export function defaultVoLanguageForLocale(locale?: string): VoLanguage {
  if (locale === "zh-Hant") return "yue";
  if (locale === "zh-Hans") return "zh";
  return "en";
}

// Map the UI locale to the matching on-screen scene text / subtitle language.
export function defaultSceneTextLanguageForLocale(locale?: string): SceneTextChoice {
  if (locale === "zh-Hant") return "zh-Hant";
  if (locale === "zh-Hans") return "zh-Hans";
  return "en";
}

// Resolve initial voiceover language for NewProjectForm, upgrading legacy auto-saved "en" defaults when UI is zh-Hant/zh-Hans.
export function resolveInitialVoLanguage(input: {
  initialLanguage?: VoLanguage;
  lastBrief?: BriefDefaults;
  locale?: string;
}): VoLanguage {
  if (input.initialLanguage) return input.initialLanguage;
  const fallback = defaultVoLanguageForLocale(input.locale);
  if (!input.lastBrief?.language) return fallback;
  if (input.lastBrief.languageExplicit || input.locale === "en" || input.lastBrief.language !== "en") {
    return input.lastBrief.language;
  }
  return fallback;
}

// Resolve initial scene text language for NewProjectForm, keeping it aligned with the UI locale unless explicitly chosen.
export function resolveInitialSceneTextLanguage(input: {
  initialSceneTextLanguage?: SceneTextChoice;
  lastBrief?: BriefDefaults;
  locale?: string;
}): SceneTextChoice {
  if (input.initialSceneTextLanguage) return input.initialSceneTextLanguage;
  const fallback = defaultSceneTextLanguageForLocale(input.locale);
  if (!input.lastBrief?.sceneTextLanguage) return fallback;
  if (
    input.lastBrief.languageExplicit ||
    input.locale === "en" ||
    input.lastBrief.sceneTextLanguage !== "en"
  ) {
    return input.lastBrief.sceneTextLanguage;
  }
  return fallback;
}

export const PICKER_DEFAULT_SKILL_SLUG = "paper-cutout-explainer-video-director";
export const DEFAULT_STARTER_CHARACTER_NAME = "Aera";

// Default director pre-selected for new videos when "paper-cutout-explainer-video-director" is offered.
export function pickerDefaultSkillSlug(
  offered: ReadonlyArray<{ slug: string }>,
): string {
  if (offered.some((skill) => skill.slug === PICKER_DEFAULT_SKILL_SLUG)) {
    return PICKER_DEFAULT_SKILL_SLUG;
  }
  return offered[0]?.slug || "";
}

type Catalog = {
  skills: Array<{ slug: string; behaviorSlug?: string }>;
  styles: Array<{ id: string }>;
  characters: Array<{ id: string; name?: string; styleId: string; styleIds?: string[] }>;
  textStyles?: Array<{ id: string }>;
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
      : pickerDefaultSkillSlug(catalog.skills);
  if (!skillSlug) return undefined;
  const styleId =
    typeof input.styleId === "string" && catalog.styles.some((style) => style.id === input.styleId)
      ? input.styleId
      : pickerDefaultStyleId(catalog.styles);
  const language = typeof input.language === "string" && isVoLanguage(input.language) ? input.language : "en";
  const languageExplicit =
    typeof input.languageExplicit === "boolean" ? input.languageExplicit : undefined;
  const narrationEnabled =
    typeof input.narrationEnabled === "boolean" ? input.narrationEnabled : undefined;
  const voiceGender =
    typeof input.voiceGender === "string" && isVoiceGender(input.voiceGender) ? input.voiceGender : "male";
  const speechPace =
    typeof input.speechPace === "string" && isSpeechPace(input.speechPace) ? input.speechPace : "medium";
  const sceneTextLanguage =
    typeof input.sceneTextLanguage === "string" && isSceneTextChoice(input.sceneTextLanguage)
      ? input.sceneTextLanguage
      : "en";
  const subtitleLook = resolveSubtitleLook(
    typeof input.subtitleLook === "string" ? input.subtitleLook : undefined,
  );
  const rawTextStyle = typeof input.textStyleId === "string" ? input.textStyleId : subtitleLook;
  const textStyleId =
    isSubtitleLook(rawTextStyle) || catalog.textStyles?.some((style) => style.id === rawTextStyle)
      ? rawTextStyle
      : subtitleLook;
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
    .filter((id) =>
      catalog.characters.some((character) => {
        const styles = character.styleIds?.length ? character.styleIds : [character.styleId];
        return character.id === id && styles.includes(styleId);
      }),
    );
  return {
    skillSlug,
    styleId,
    language,
    ...(languageExplicit !== undefined ? { languageExplicit } : {}),
    ...(narrationEnabled !== undefined ? { narrationEnabled } : {}),
    voiceGender,
    speechPace,
    sceneTextLanguage,
    subtitleLook,
    textStyleId,
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

// Auto-pick matching ready characters when a new video starts or changes style so Step 01 is immediately actionable.
// Prefers the default system starter character "Aera" when she matches the selected style.
export function defaultCastIdsForStyle(
  characters: ReadonlyArray<{
    id: string;
    name?: string;
    styleId: string;
    styleIds?: readonly string[];
    previewUrl?: string | null;
  }>,
  styleId: string,
  requiredCount: number,
): string[] {
  if (requiredCount <= 0) return [];
  const matching = characters.filter((character) => {
    if ("previewUrl" in character && !character.previewUrl) return false;
    const styles = character.styleIds?.length ? character.styleIds : [character.styleId];
    return styles.includes(styleId);
  });
  if (matching.length < requiredCount) return [];
  const targetName = DEFAULT_STARTER_CHARACTER_NAME.toLowerCase();
  const ordered = [...matching].sort((a, b) => {
    const aPreferred = a.name?.trim().toLowerCase() === targetName ? 0 : 1;
    const bPreferred = b.name?.trim().toLowerCase() === targetName ? 0 : 1;
    return aPreferred - bPreferred;
  });
  return ordered.slice(0, requiredCount).map((character) => character.id);
}

type CastCharacter = {
  id: string;
  name?: string;
  styleId: string;
  styleIds?: readonly string[];
  previewUrl?: string | null;
};

function castMatchesStyle(character: CastCharacter, styleId: string) {
  if ("previewUrl" in character && !character.previewUrl) return false;
  const styles = character.styleIds?.length ? character.styleIds : [character.styleId];
  return styles.includes(styleId);
}

// Keep a remembered cast that fits this director. Story may stay at one character.
// A director that needs more slots keeps the remembered people and fills only the empty slots.
function castFromRememberedIds(
  ids: readonly string[],
  input: {
    ruleSlug: string;
    styleId: string;
    characters: ReadonlyArray<CastCharacter>;
  },
): string[] | undefined {
  const matching = ids.filter((id) =>
    input.characters.some((character) => character.id === id && castMatchesStyle(character, input.styleId)),
  );
  if (matching.length === 0) return undefined;
  if (input.ruleSlug === STORY_SHORT_SKILL_SLUG) return matching.slice(0, 2);
  const need = requiredCastCount(input.ruleSlug);
  const slotCount = Math.max(1, need);
  if (matching.length >= slotCount) return matching.slice(0, slotCount);
  const filler = defaultCastIdsForStyle(input.characters, input.styleId, slotCount).filter(
    (id) => !matching.includes(id),
  );
  return [...matching, ...filler].slice(0, slotCount);
}

// Resolve initial characterIds for NewProjectForm. A saved video keeps its cast.
// Otherwise the last character picked anywhere wins, then this folder's last brief, then Aera.
export function resolveInitialBriefCharacterIds(input: {
  initialCastCharacterIds?: readonly string[];
  rememberedIds?: readonly string[];
  lastBrief?: BriefDefaults;
  ruleSlug: string;
  styleId: string;
  characters: ReadonlyArray<CastCharacter>;
}): string[] {
  if (input.initialCastCharacterIds !== undefined) {
    return [...input.initialCastCharacterIds];
  }
  if (isPapercraftDioramaSkill(input.ruleSlug)) {
    return [];
  }
  const fromGlobal = castFromRememberedIds(input.rememberedIds ?? [], input);
  if (fromGlobal) return fromGlobal;
  const fromFolder = castFromRememberedIds(input.lastBrief?.characterIds ?? [], input);
  if (fromFolder) return fromFolder;
  const need = requiredCastCount(input.ruleSlug);
  return defaultCastIdsForStyle(input.characters, input.styleId, Math.max(1, need));
}


