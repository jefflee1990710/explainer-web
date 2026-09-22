import { resolveDefaultVersion, versionNumber } from "@/service/character/versions";
import { resolveSceneText } from "@/service/director/scene-text";
import { folderRollupStatus } from "@/service/folder";
import { normalizeProjectStatus } from "@/service/project-status";
import { resolveStyle, type StyleId } from "@/service/style";
import type { AppUser } from "@/model/user";
import type { Character, CharacterVersionStatus } from "@/model/character";
import type { Folder } from "@/model/folder";
import type { Project, ProjectStatus } from "@/model/project";
import type { Skill } from "@/model/skill";
import type { Subscription } from "@/model/subscription";

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
  sceneTextEnabled: boolean;
  sceneTextLanguage: NonNullable<Project["sceneTextLanguage"]>;
  characterImageUrl?: string;
  characterStillUrl?: string;
  stillError?: string;
  cast: Array<{ characterId: string; name: string; blueprintUrl: string }>;
  status: ProjectStatus;
  phaseA?: Project["phaseA"];
  frames: NonNullable<Project["frames"]>;
  clips: Project["clips"];
  reelUrl?: string;
  reelStatus?: Project["reelStatus"];
  reelFingerprint?: string;
  reelError?: string;
  error?: string;
  createdAt: string;
};

export type PublicProject = PublicVideo; // remove after call sites updated

export type PublicFolder = {
  id: string;
  name: string;
  status: ProjectStatus;
  videoCount: number;
  previewUrl: string | null;
  createdAt: string;
  videos: PublicVideo[];
};

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
    sceneTextEnabled: sceneText.enabled,
    sceneTextLanguage: sceneText.language,
    characterImageUrl: video.characterImageUrl,
    characterStillUrl: video.characterStillUrl,
    stillError: video.stillError,
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
    error: video.error,
    createdAt: video.createdAt.toISOString(),
  };
}

export function toPublicFolder(folder: Folder, videos: Project[]): PublicFolder {
  const publicVideos = videos
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(toPublicVideo);
  const statuses = videos.map((video) => normalizeProjectStatus(video.status));
  const cover =
    publicVideos.find((video) => previewFromVideo(video)) || publicVideos[0];
  return {
    id: folder._id.toHexString(),
    name: folder.name,
    status: folderRollupStatus(statuses),
    videoCount: videos.length,
    previewUrl: cover ? previewFromVideo(cover) : null,
    createdAt: folder.createdAt.toISOString(),
    videos: publicVideos,
  };
}

function previewFromVideo(video: PublicVideo) {
  const frames = video.frames.filter((frame) => frame.status === "completed");
  const first =
    frames.find((frame) => frame.clipNumber === 1 && frame.position === "start") ||
    frames[0];
  return (
    first?.blobUrl ||
    first?.outputUrl ||
    video.characterStillUrl ||
    video.characterImageUrl ||
    null
  );
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
