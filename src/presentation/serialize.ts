import { resolveDefaultVersion, versionNumber } from "@/service/character/versions";
import { resolveSceneText } from "@/service/director/scene-text";
import { resolveVoiceGender } from "@/service/director/voice";
import { resolveSpeechPace } from "@/service/director/speech-pace";
import { clipGenerationTags, productionCounts, type GenerationDetailTag } from "@/service/clip-stage";
import { folderRollupStatus } from "@/service/folder";
import { normalizeProjectStatus } from "@/service/project-status";
import { resolveStyle, type StyleId } from "@/service/style";
import type { AppUser } from "@/model/user";
import type { Character, CharacterVersionStatus } from "@/model/character";
import type { Folder } from "@/model/folder";
import type { Project, ProjectStatus } from "@/model/project";
import type { Skill } from "@/model/skill";
import type { Subscription } from "@/model/subscription";
import type { VideoEdit, VideoTemplate } from "@/model/video-edit";

export type PublicSkill = {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
};

export type PublicStyle = {
  id: StyleId;
  name: string;
  nameZh: string;
  description: string;
  canvasColor: string;
  previewUrl?: string;
};

export type PublicVideo = {
  id: string;
  projectId: string;
  skillSlug: string;
  source: string;
  aspectRatio: Project["aspectRatio"];
  durationPreset: Project["durationPreset"];
  styleId: StyleId;
  language: NonNullable<Project["language"]>;
  voiceGender: NonNullable<Project["voiceGender"]>;
  speechPace: NonNullable<Project["speechPace"]>;
  sceneTextEnabled: boolean;
  sceneTextLanguage: NonNullable<Project["sceneTextLanguage"]>;
  characterImageUrl?: string;
  characterStillUrl?: string;
  stillError?: string;
  logoUrl?: string;
  cast: Array<{ characterId: string; name: string; blueprintUrl: string }>;
  status: ProjectStatus;
  phaseA?: Project["phaseA"];
  frames: NonNullable<Project["frames"]>;
  clips: Project["clips"];
  reelUrl?: string;
  reelStatus?: Project["reelStatus"];
  reelFingerprint?: string;
  reelError?: string;
  edit?: VideoEdit;
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
  // Per-clip scene frames and videos, shown while the video is in production.
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

export function toPublicSkill(skill: Skill): PublicSkill {
  return {
    id: skill._id.toHexString(),
    slug: skill.slug,
    title: skill.title,
    titleZh: skill.titleZh,
    description: skill.description,
  };
}

export function toPublicVideo(video: Project): PublicVideo {
  const sceneText = resolveSceneText(video);
  return {
    id: video._id.toHexString(),
    projectId: video.projectId.toHexString(),
    skillSlug: video.skillSlug,
    source: video.source,
    aspectRatio: video.aspectRatio,
    durationPreset: video.durationPreset,
    styleId: resolveStyle(video.styleId).id,
    language: video.language || "en",
    voiceGender: resolveVoiceGender(video.voiceGender),
    speechPace: resolveSpeechPace(video.speechPace),
    sceneTextEnabled: sceneText.enabled,
    sceneTextLanguage: sceneText.language,
    characterImageUrl: video.characterImageUrl,
    characterStillUrl: video.characterStillUrl,
    stillError: video.stillError,
    logoUrl: video.logoUrl,
    cast: (video.cast || []).map((member) => ({
      characterId: member.characterId.toHexString(),
      name: member.name,
      blueprintUrl: member.blueprintUrl,
    })),
    status: normalizeProjectStatus(video.status),
    phaseA: video.phaseA,
    frames: video.frames || [],
    clips: video.clips,
    reelUrl: video.reelUrl,
    reelStatus: video.reelStatus,
    reelFingerprint: video.reelFingerprint,
    reelError: video.reelError,
    edit: video.edit,
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

export function toPublicFolder(folder: Folder, videos: Project[]): PublicFolder {
  const cards = videos
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
  number: number;
  parentVersionId?: string;
  parentNumber?: number;
  prompt: string;
  editInstruction?: string;
  referenceImageUrl?: string;
  blueprintUrl?: string;
  status: CharacterVersionStatus;
  error?: string;
  createdAt: string;
};

export type PublicCharacter = {
  id: string;
  name: string;
  styleId: StyleId;
  styleName: string;
  defaultVersionId: string | null;
  // Default sheet, or null when nothing has completed yet.
  previewUrl: string | null;
  // Newest first.
  versions: PublicCharacterVersion[];
  pending: boolean;
  failed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicCharacter(character: Character): PublicCharacter {
  const resolved = resolveDefaultVersion(character);
  const versions = character.versions
    .map((version) => ({
      id: version.id.toHexString(),
      number: versionNumber(character, version.id),
      parentVersionId: version.parentVersionId?.toHexString(),
      parentNumber: version.parentVersionId
        ? versionNumber(character, version.parentVersionId) || undefined
        : undefined,
      prompt: version.prompt,
      editInstruction: version.editInstruction,
      referenceImageUrl: version.referenceImageUrl,
      blueprintUrl: version.blueprintUrl,
      status: version.status,
      error: version.error,
      createdAt: version.createdAt.toISOString(),
    }))
    .sort((a, b) => b.number - a.number);
  const newest = character.versions[character.versions.length - 1];
  return {
    id: character._id.toHexString(),
    name: character.name,
    styleId: character.styleId,
    styleName: resolveStyle(character.styleId).nameZh,
    defaultVersionId: resolved ? resolved.id.toHexString() : null,
    previewUrl: resolved?.blueprintUrl || null,
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
