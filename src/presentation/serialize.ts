import { characterStyleIds, resolveVersionForStyle, versionStyleId } from "@/service/character/character-styles";
import { resolveDefaultVersion, versionNumber } from "@/service/character/versions";
import { behaviorSlug, isCustomSkill } from "@/service/director/behavior-slug";
import { emptyPerformance } from "@/service/director/performance";
import { emptyProfile, parseSystemProfile } from "@/service/director/profile";
import { resolveSceneText } from "@/service/director/scene-text";
import { resolveSubtitleLook } from "@/service/director/subtitle-look";
import { resolveVoiceGender } from "@/service/director/voice";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { clipGenerationTags, productionCounts, type GenerationDetailTag } from "@/service/clip-stage";
import { folderRollupStatus } from "@/service/folder";
import { normalizeProjectStatus } from "@/service/project-status";
import { DEFAULT_STYLE_ID, type StyleId } from "@/service/style";
import type { AppUser } from "@/model/user";
import type {
  Character,
  CharacterBlueprintKind,
  CharacterBlueprintStage,
  CharacterVersionStatus,
} from "@/model/character";
import type { CharacterSpec } from "@/model/character-spec";
import type { Product } from "@/model/product";
import type { TextStyleDoc } from "@/model/text-style";
import { parseCharacterVoice, type CharacterVoice } from "@/model/character-voice";
import type { Folder } from "@/model/folder";
import type { Project, ProjectStatus } from "@/model/project";
import type { PerformanceSlots } from "@/model/director-performance";
import type { DirectorProfile, SystemProfile } from "@/model/director-profile";
import type { DirectorChatMessage, DirectorPreviewStatus, Skill } from "@/model/skill";
import type { Subscription } from "@/model/subscription";
import type { VideoEdit, VideoTemplate } from "@/model/video-edit";

export type PublicSkill = {
  id: string;
  slug: string;
  title: string;
  description: string;
  // Template slug for custom directors; drives skill-specific form rules.
  behaviorSlug: string;
  isCustom: boolean;
  previewUrl?: string;
  updatedAt: string;
};

export type PublicStyle = {
  id: string;
  name: string;
  description: string;
  canvasColor: string;
  previewUrl?: string;
  isCustom: boolean;
  baseStyleId?: StyleId;
  templateName?: string;
  updatedAt?: string;
};

export type PublicVideo = {
  id: string;
  projectId: string;
  skillId: string;
  skillSlug: string;
  source: string;
  spokenScript?: string;
  aspectRatio: Project["aspectRatio"];
  durationPreset: Project["durationPreset"];
  styleId: string;
  language: NonNullable<Project["language"]>;
  voiceGender: NonNullable<Project["voiceGender"]>;
  speechPace: NonNullable<Project["speechPace"]>;
  sceneTextEnabled: boolean;
  sceneTextLanguage: NonNullable<Project["sceneTextLanguage"]>;
  subtitleLook: NonNullable<Project["subtitleLook"]>;
  textStyleId?: string;
  textStyleImageUrl?: string;
  characterImageUrl?: string;
  characterStillUrl?: string;
  stillError?: string;
  logoUrl?: string;
  referenceImages: NonNullable<Project["referenceImages"]>;
  backgroundImageUrls: string[];
  // `voiceSample` carries the clone id so clip prices include the voice swap.
  cast: Array<{
    characterId: string;
    name: string;
    blueprintUrl: string;
    voiceSample?: { elevenVoiceId: string };
  }>;
  products: Array<{ productId: string; name: string; blueprintUrl: string }>;
  status: ProjectStatus;
  phaseA?: Project["phaseA"];
  frames: NonNullable<Project["frames"]>;
  clips: Project["clips"];
  sceneChats?: Array<{
    clipNumber: number;
    messages: Array<{
      role: "user" | "assistant";
      content: string;
      changedPaths?: Array<"startScene" | "endScene" | "motionCamera">;
      createdAt: string;
    }>;
  }>;
  reelUrl?: string;
  reelStatus?: Project["reelStatus"];
  reelFingerprint?: string;
  reelError?: string;
  reelStep?: { current: number; total: number; phase: "download" | "join" };
  edit?: VideoEdit;
  coverUrl?: string;
  coverStatus?: Project["coverStatus"];
  coverPrompt?: string;
  coverSafeAreas?: Project["coverSafeAreas"];
  coverInset?: boolean;
  editTemplateId?: string;
  finalUrl?: string;
  finalStatus?: Project["finalStatus"];
  finalFingerprint?: string;
  finalError?: string;
  finalQueuedAt?: string;
  error?: string;
  createdAt: string;
};

export type PublicProject = PublicVideo; // remove after call sites updated

// Card/list row: no storyboard, edit, or unused frame/clip payloads.
export type PublicVideoCard = {
  id: string;
  title: string;
  englishTitle: string;
  source: string;
  status: ProjectStatus;
  aspectRatio: Project["aspectRatio"];
  durationPreset: Project["durationPreset"];
  language: NonNullable<Project["language"]>;
  createdAt: string;
  previewUrls: string[];
  error?: string;
  videosDone: number;
  videosTotal: number;
  // Per-clip scene and video steps for the card progress bar.
  tags: GenerationDetailTag[];
};

export type PublicFolder = {
  id: string;
  name: string;
  status: ProjectStatus;
  videoCount: number;
  previewUrl: string | null;
  // Cover video frames, left to right, so 9:16 stills fit a 16:9 card.
  previewUrls: string[];
  createdAt: string;
  videos: PublicVideoCard[];
};

// Mongo fields for folder/dashboard cards. Editor loads the rest on open.
export const VIDEO_LIST_PROJECTION = {
  _id: 1,
  projectId: 1,
  status: 1,
  source: 1,
  aspectRatio: 1,
  durationPreset: 1,
  language: 1,
  createdAt: 1,
  updatedAt: 1,
  error: 1,
  characterStillUrl: 1,
  characterImageUrl: 1,
  "phaseA.localizedTitle": 1,
  "phaseA.englishTitle": 1,
  "phaseA.clips.clipNumber": 1,
  "frames.clipNumber": 1,
  "frames.position": 1,
  "frames.status": 1,
  "frames.blobUrl": 1,
  "frames.outputUrl": 1,
  "clips.clipNumber": 1,
  "clips.status": 1,
  "clips.blobUrl": 1,
  "clips.outputUrl": 1,
} as const;

function publicPreviewUrl(url?: string, hash?: string) {
  if (!url) return undefined;
  if (!hash) return url;
  return `${url}${url.includes("?") ? "&" : "?"}h=${hash.slice(0, 10)}`;
}

export function toPublicSkill(skill: Skill, inheritedPreviewUrl?: string): PublicSkill {
  return {
    id: skill._id.toHexString(),
    slug: skill.slug,
    title: skill.title,
    description: skill.description,
    behaviorSlug: behaviorSlug(skill),
    isCustom: isCustomSkill(skill),
    previewUrl: publicPreviewUrl(skill.previewUrl || inheritedPreviewUrl, skill.previewHash),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

// Custom directors reuse the system template's card still.
export function toPublicSkills(skills: Skill[]): PublicSkill[] {
  const published = skills.map((skill) => toPublicSkill(skill));
  const systemPreview = new Map(
    published
      .filter((skill) => !skill.isCustom && skill.previewUrl)
      .map((skill) => [skill.slug, skill.previewUrl!]),
  );
  return published.map((skill) => {
    if (skill.previewUrl || !skill.isCustom) return skill;
    const inherited = systemPreview.get(skill.behaviorSlug);
    return inherited ? { ...skill, previewUrl: inherited } : skill;
  });
}

// Director detail payload: public profile fields and the AI chat — never the skill prompt.
export type PublicDirector = PublicSkill & {
  baseSlug?: string;
  profile?: SystemProfile;
  customProfile?: DirectorProfile;
  extraInstructions?: string;
  // On-camera performance slots: template English set for system directors, editable copy for forks.
  performance?: PerformanceSlots;
  customPerformance?: PerformanceSlots;
  previewStatus: DirectorPreviewStatus;
  previewHash?: string;
  hasOwnPreview: boolean;
  chat: Array<{
    role: DirectorChatMessage["role"];
    content: string;
    imageUrl?: string;
    previewUrl?: string;
    changedPaths?: string[];
    createdAt: string;
  }>;
};

export function toPublicDirectorChat(chat: DirectorChatMessage[]): PublicDirector["chat"] {
  return chat.map((item) => ({
    role: item.role,
    content: item.content,
    imageUrl: item.imageUrl,
    previewUrl: item.previewUrl,
    changedPaths: item.changedPaths,
    createdAt: item.createdAt.toISOString(),
  }));
}

export function toPublicDirector(skill: Skill, inheritedPreviewUrl?: string): PublicDirector {
  const custom = isCustomSkill(skill);
  const hasOwnPreview = Boolean(skill.previewUrl);
  return {
    ...toPublicSkill(skill, inheritedPreviewUrl),
    baseSlug: skill.baseSlug,
    profile: custom || !skill.profile ? undefined : parseSystemProfile(skill.profile),
    customProfile: custom ? { ...emptyProfile(), ...skill.customProfile } : undefined,
    extraInstructions: custom ? skill.extraInstructions ?? "" : undefined,
    performance: custom ? undefined : skill.performance?.en,
    customPerformance: custom && skill.customPerformance ? { ...emptyPerformance(), ...skill.customPerformance } : undefined,
    previewStatus: skill.previewStatus ?? "idle",
    // Only an owned still can disable regenerate. Inherited template stills stay replaceable.
    previewHash: hasOwnPreview ? skill.previewHash : undefined,
    hasOwnPreview,
    chat: toPublicDirectorChat(skill.chat || []),
  };
}

function chatCreatedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function toPublicSceneChats(chats: Project["sceneChats"]): PublicVideo["sceneChats"] {
  if (!chats?.length) return undefined;
  return chats.map((thread) => ({
    clipNumber: thread.clipNumber,
    messages: thread.messages.map((item) => ({
      role: item.role,
      content: item.content,
      changedPaths: item.changedPaths,
      createdAt: chatCreatedAt(item.createdAt),
    })),
  }));
}

export function toPublicVideo(video: Project): PublicVideo {
  const sceneText = resolveSceneText(video);
  return {
    id: video._id.toHexString(),
    projectId: video.projectId.toHexString(),
    skillId: video.skillId.toHexString(),
    skillSlug: video.skillSlug,
    source: video.source,
    spokenScript: video.spokenScript,
    aspectRatio: video.aspectRatio,
    durationPreset: video.durationPreset,
    styleId: video.styleId || DEFAULT_STYLE_ID,
    language: video.language || "en",
    voiceGender: resolveVoiceGender(video.voiceGender),
    speechPace: resolveSpeechPace(video.speechPace),
    sceneTextEnabled: sceneText.enabled,
    sceneTextLanguage: sceneText.language,
    subtitleLook: resolveSubtitleLook(video.subtitleLook),
    textStyleId: video.textStyleId,
    textStyleImageUrl: video.textStyleImageUrl,
    characterImageUrl: video.characterImageUrl,
    characterStillUrl: video.characterStillUrl,
    stillError: video.stillError,
    logoUrl: video.logoUrl,
    referenceImages: video.referenceImages || [],
    backgroundImageUrls: video.backgroundImageUrls || [],
    cast: (video.cast || []).map((member) => ({
      characterId: member.characterId.toHexString(),
      name: member.name,
      blueprintUrl: member.blueprintUrl,
      ...(member.voiceSample
        ? { voiceSample: { elevenVoiceId: member.voiceSample.elevenVoiceId } }
        : {}),
    })),
    products: (video.products || []).map((item) => ({
      productId: item.productId.toHexString(),
      name: item.name,
      blueprintUrl: item.blueprintUrl,
    })),
    status: normalizeProjectStatus(video.status),
    phaseA: video.phaseA,
    frames: video.frames || [],
    clips: video.clips,
    sceneChats: toPublicSceneChats(video.sceneChats),
    reelUrl: video.reelUrl,
    reelStatus: video.reelStatus,
    reelFingerprint: video.reelFingerprint,
    reelError: video.reelError,
    reelStep: video.reelStep,
    edit: video.edit,
    coverUrl: video.coverUrl,
    coverStatus: video.coverStatus,
    coverPrompt: video.coverPrompt,
    coverSafeAreas: video.coverSafeAreas,
    coverInset: video.coverInset,
    editTemplateId: video.editTemplateId?.toHexString(),
    finalUrl: video.finalUrl,
    finalStatus: video.finalStatus,
    finalFingerprint: video.finalFingerprint,
    finalError: video.finalError,
    finalQueuedAt: video.finalQueuedAt?.toISOString(),
    error: video.error,
    createdAt: video.createdAt.toISOString(),
  };
}

export function toPublicVideoCard(video: Project): PublicVideoCard {
  const frames = video.frames || [];
  const clips = video.clips || [];
  const source = { ...video, frames, clips };
  const counts = productionCounts(source);
  const previewUrls = previewUrlsFromVideo({
    frames,
    characterStillUrl: video.characterStillUrl,
    characterImageUrl: video.characterImageUrl,
  });
  return {
    id: video._id.toHexString(),
    title: video.phaseA?.localizedTitle || "",
    englishTitle: video.phaseA?.englishTitle || "",
    source: video.source,
    status: normalizeProjectStatus(video.status),
    aspectRatio: video.aspectRatio,
    durationPreset: video.durationPreset,
    language: video.language || "en",
    createdAt: video.createdAt.toISOString(),
    previewUrls,
    error: video.error,
    videosDone: counts.videosDone,
    videosTotal: counts.total,
    tags: clipGenerationTags(source),
  };
}

// Same card shape from an already-serialized editor video (optimistic create).
export function toPublicVideoCardFromPublic(video: PublicVideo): PublicVideoCard {
  const counts = productionCounts(video);
  return {
    id: video.id,
    title: video.phaseA?.localizedTitle || "",
    englishTitle: video.phaseA?.englishTitle || "",
    source: video.source,
    status: video.status,
    aspectRatio: video.aspectRatio,
    durationPreset: video.durationPreset,
    language: video.language,
    createdAt: video.createdAt,
    previewUrls: previewUrlsFromVideo(video),
    error: video.error,
    videosDone: counts.videosDone,
    videosTotal: counts.total,
    tags: clipGenerationTags(video),
  };
}

function videoRecencyMs(video: Pick<Project, "createdAt" | "updatedAt">) {
  return (video.updatedAt ?? video.createdAt).getTime();
}

export function toPublicFolder(folder: Folder, videos: Project[]): PublicFolder {
  const cards = videos
    .slice()
    .sort((a, b) => videoRecencyMs(b) - videoRecencyMs(a))
    .map(toPublicVideoCard);
  const statuses = videos.map((video) => normalizeProjectStatus(video.status));
  const cover = cards.find((video) => video.previewUrls.length > 0) || cards[0];
  const previewUrls = cover?.previewUrls ?? [];
  return {
    id: folder._id.toHexString(),
    name: folder.name,
    status: folderRollupStatus(statuses),
    videoCount: videos.length,
    previewUrl: previewUrls[0] || null,
    previewUrls,
    createdAt: folder.createdAt.toISOString(),
    videos: cards,
  };
}

const PREVIEW_STRIP_MAX = 4;

export type PreviewMediaSource = {
  frames?: Array<{
    clipNumber: number;
    position: string;
    status: string;
    blobUrl?: string;
    outputUrl?: string;
  }>;
  characterStillUrl?: string;
  characterImageUrl?: string;
};

// Start frames first so the strip reads as a left-to-right scene sequence.
export function previewUrlsFromVideo(video: PreviewMediaSource, max = PREVIEW_STRIP_MAX) {
  const completed = (video.frames || [])
    .filter((frame) => frame.status === "completed")
    .slice()
    .sort((a, b) => {
      if (a.clipNumber !== b.clipNumber) return a.clipNumber - b.clipNumber;
      if (a.position === b.position) return 0;
      return a.position === "start" ? -1 : 1;
    });

  const urls: string[] = [];
  function push(url?: string) {
    if (!url || urls.includes(url) || urls.length >= max) return;
    urls.push(url);
  }

  for (const frame of completed) {
    if (frame.position === "start") push(frame.blobUrl || frame.outputUrl);
  }
  for (const frame of completed) {
    if (frame.position === "end") push(frame.blobUrl || frame.outputUrl);
  }
  push(video.characterStillUrl);
  push(video.characterImageUrl);
  return urls;
}

function previewFromVideo(video: PreviewMediaSource | Pick<PublicVideoCard, "previewUrls">) {
  if ("previewUrls" in video) return video.previewUrls[0] || null;
  return previewUrlsFromVideo(video, 1)[0] || null;
}

export { previewFromVideo as videoPreviewUrl };

export function publicUser(user: AppUser) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    credits: user.credits,
  };
}

export function publicSubscription(sub: Subscription | null) {
  if (!sub) return null;
  return {
    planId: sub.planId,
    status: sub.status,
    monthlyCredits: sub.monthlyCredits,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  };
}

export type PublicCharacterVersion = {
  id: string;
  styleId: string;
  number: number;
  parentVersionId?: string;
  parentNumber?: number;
  prompt: string;
  editInstruction?: string;
  referenceImageUrl?: string;
  // "sheet" for rows made before boards existed.
  blueprintKind: CharacterBlueprintKind;
  // Board versions: which image is generating now.
  stage?: CharacterBlueprintStage;
  portraitUrl?: string;
  blueprintUrl?: string;
  profileUrl?: string;
  spec?: CharacterSpec;
  status: CharacterVersionStatus;
  error?: string;
  createdAt: string;
};

export type PublicCharacter = {
  id: string;
  name: string;
  styleId: string;
  // Every style on this character, original first.
  styleIds: string[];
  styleName: string;
  voice: CharacterVoice | null;
  // Uploaded demo voice. The clone id stays on the server.
  voiceSample: { url: string; durationSeconds: number } | null;
  defaultVersionId: string | null;
  // Chosen sheet for each style that has a completed blueprint.
  defaultByStyle: Record<string, string>;
  // Board versions show the composed blueprint. Older sheets still use the standing figure.
  previewUrl: string | null;
  // True when previewUrl is a legacy standing figure, so the card can crop to the body.
  previewIsProfile: boolean;
  // A portrait job is still in flight.
  profilePending: boolean;
  // Newest first.
  versions: PublicCharacterVersion[];
  pending: boolean;
  failed: boolean;
  createdAt: string;
  updatedAt: string;
};

// The library card shows the new board (portrait + full body). A legacy sheet
// still falls back to the standing figure, then the old turnaround.
function characterPreview(version: Character["versions"][number] | null) {
  if (!version) return { url: null, isProfile: false };
  if (version.blueprintKind === "board") {
    return { url: version.blueprintUrl || version.portraitUrl || null, isProfile: false };
  }
  return {
    url: version.profileUrl || version.blueprintUrl || null,
    isProfile: Boolean(version.profileUrl),
  };
}

export function toPublicCharacter(character: Character): PublicCharacter {
  const resolved = resolveDefaultVersion(character);
  const versions = character.versions
    .map((version) => ({
      id: version.id.toHexString(),
      styleId: versionStyleId(character, version),
      number: versionNumber(character, version.id),
      parentVersionId: version.parentVersionId?.toHexString(),
      parentNumber: version.parentVersionId
        ? versionNumber(character, version.parentVersionId) || undefined
        : undefined,
      prompt: version.prompt,
      editInstruction: version.editInstruction,
      referenceImageUrl: version.referenceImageUrl,
      blueprintKind: version.blueprintKind ?? "sheet",
      stage: version.stage,
      portraitUrl: version.portraitUrl,
      blueprintUrl: version.blueprintUrl,
      profileUrl: version.profileUrl,
      spec: version.spec,
      status: version.status,
      error: version.error,
      createdAt: version.createdAt.toISOString(),
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const newest = character.versions[character.versions.length - 1];
  const defaultByStyle: Record<string, string> = {};
  for (const styleId of characterStyleIds(character)) {
    const sheet = resolveVersionForStyle(character, styleId);
    if (sheet) defaultByStyle[styleId] = sheet.id.toHexString();
  }
  const preview = characterPreview(resolved);
  return {
    id: character._id.toHexString(),
    name: character.name,
    styleId: character.styleId,
    styleIds: characterStyleIds(character),
    styleName: character.styleId,
    voice: parseCharacterVoice(character.voice),
    voiceSample: character.voiceSample
      ? { url: character.voiceSample.url, durationSeconds: character.voiceSample.durationSeconds }
      : null,
    defaultVersionId: resolved ? resolved.id.toHexString() : null,
    defaultByStyle,
    previewUrl: preview.url,
    previewIsProfile: preview.isProfile,
    profilePending: character.versions.some((version) => version.profileStatus === "queued"),
    versions,
    pending: character.versions.some(
      (version) => version.status === "queued" || version.status === "in_progress",
    ),
    failed: newest?.status === "failed",
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  };
}

// Template row for the Video tab picker.
export type PublicTemplate = VideoEdit & { id: string; name: string; updatedAt: string };

export type PublicProduct = {
  id: string;
  name: string;
  description: string;
  referenceImageUrls: string[];
  blueprintUrl?: string;
  status: Product["status"];
  pending: boolean;
  failed: boolean;
};

export function toPublicProduct(product: Product): PublicProduct {
  return {
    id: product._id.toHexString(),
    name: product.name,
    description: product.description,
    referenceImageUrls: product.referenceImageUrls,
    blueprintUrl: product.blueprintUrl,
    status: product.status,
    pending: product.status === "queued" || product.status === "in_progress",
    failed: product.status === "failed",
  };
}

export type PublicTextStyle = {
  id: string;
  name: string;
  imageUrl: string;
  updatedAt: string;
};

export function toPublicTextStyle(doc: TextStyleDoc): PublicTextStyle {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    imageUrl: doc.imageUrl,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toPublicTemplate(template: VideoTemplate): PublicTemplate {
  return {
    id: template._id.toHexString(),
    name: template.name,
    layers: template.layers,
    intro: template.intro,
    outro: template.outro,
    updatedAt: template.updatedAt.toISOString(),
  };
}
