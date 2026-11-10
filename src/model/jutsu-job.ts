import { ObjectId } from "mongodb";
import type { AspectRatio } from "@/model/project";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";

/**
 * Normalize 1..6 character reference image URLs (trimming, deduplicating, and falling back to `fallbackUrl`).
 */
export function normalizeJutsuReferenceUrls(
  urls?: readonly (string | undefined | null)[] | null,
  fallbackUrl?: string | null,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (raw?: string | null) => {
    const trimmed = (raw || "").trim();
    if (
      !trimmed ||
      !/^https?:\/\//i.test(trimmed) ||
      seen.has(trimmed) ||
      result.length >= MAX_CHARACTER_REFERENCES
    ) {
      return;
    }
    seen.add(trimmed);
    result.push(trimmed);
  };
  if (Array.isArray(urls)) {
    for (const u of urls) push(u);
  }
  if (result.length === 0 && fallbackUrl) {
    push(fallbackUrl);
  }
  return result;
}

/** Append new character reference image URLs onto an existing list (deduplicated, capped at 6). */
export function appendJutsuReferenceUrls(
  existing: readonly string[],
  incoming: readonly string[],
): string[] {
  return normalizeJutsuReferenceUrls([...existing, ...incoming]);
}

/** Remove one character reference image URL from a list while preserving order. */
export function removeJutsuReferenceUrl(
  existing: readonly string[],
  urlToRemove: string,
): string[] {
  const target = (urlToRemove || "").trim();
  return normalizeJutsuReferenceUrls(existing.filter((u) => u.trim() !== target));
}

/**
 * Build the initial per-person slot assignment when SAM 3 detects people in the opening frame.
 * Preserves any pre-uploaded custom character reference photos and any pre-selected outfit look on Person #1.
 */
export function buildInitialPersonSlotAssignment(input: {
  personIndex: number;
  characterId: string;
  characterName: string;
  defaultLookUrl: string;
  defaultLookLabel: string;
  lookTab?: "presets" | "historical";
  selectedLookKey?: string;
  selectedLookUrl?: string;
  lookLabel?: string;
  uploadedPhotoUrls?: readonly string[];
}): {
  keepOriginal: boolean;
  characterId: string;
  characterName: string;
  lookTab: "presets" | "historical";
  selectedLookKey: string;
  selectedLookUrl: string;
  lookLabel: string;
  uploadedPhotoUrl: string;
  uploadedPhotoUrls: string[];
} {
  const isPrimary = input.personIndex === 1;
  const customUrls = isPrimary
    ? normalizeJutsuReferenceUrls(input.uploadedPhotoUrls)
    : [];
  const lookTab = isPrimary && input.lookTab ? input.lookTab : "presets";
  const selectedLookKey =
    isPrimary && input.selectedLookKey?.trim() ? input.selectedLookKey.trim() : "default";
  const selectedLookUrl =
    isPrimary && input.selectedLookUrl?.trim()
      ? input.selectedLookUrl.trim()
      : input.defaultLookUrl;
  const lookLabel =
    isPrimary && input.lookLabel?.trim() ? input.lookLabel.trim() : input.defaultLookLabel;
  return {
    keepOriginal: !isPrimary,
    characterId: input.characterId,
    characterName: input.characterName,
    lookTab,
    selectedLookKey,
    selectedLookUrl,
    lookLabel,
    uploadedPhotoUrl: customUrls[0] ?? "",
    uploadedPhotoUrls: customUrls,
  };
}

export const JUTSU_MODES = [
  "character_swap",
  "montage_swap",
  "object_swap",
  "relight_video",
  "color_fix",
] as const;

export type JutsuMode = (typeof JUTSU_MODES)[number];

export const JUTSU_SWAP_SUB_MODES = [
  "standard",
  "advanced",
  "montage",
] as const;

export type JutsuSwapSubMode = (typeof JUTSU_SWAP_SUB_MODES)[number];

export const JUTSU_OBJECT_EDIT_MODES = [
  "change",
  "remove",
  "background",
  "add",
] as const;

export type JutsuObjectEditMode = (typeof JUTSU_OBJECT_EDIT_MODES)[number];

export const JUTSU_TONE_MODES = [
  "Reinhard",
  "Filmic Soft",
  "Filmic Strong",
  "ACES Approx",
  "Cineon-ish",
] as const;

export type JutsuToneMode = (typeof JUTSU_TONE_MODES)[number];

export type JutsuToneSettings = {
  mode: JutsuToneMode;
  exposure: number;
  contrast: number;
  pivot: number;
  highlight_rolloff: number;
  shadow_lift: number;
  black_floor: number;
  saturation: number;
  strength: number;
};

export type JutsuColorSettings = {
  detail: number | null;
  tone: JutsuToneSettings | null;
};

export type JutsuPlacementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type JutsuPersonAnchor = {
  objectId: number;
  anchorPoint: { x: number; y: number };
};

export type JutsuPersonMapping = {
  objectId: number;
  personIndex: number;
  anchorPoint: { x: number; y: number };
  box: JutsuPlacementBox;
  characterId?: string;
  characterName?: string;
  role?: string;
  referenceImageUrl: string;
  referenceImageUrls?: string[];
  characterOutfitSpec?: string;
};

export type JutsuJobStatus =
  | "prepared"
  | "rendering"
  | "completed"
  | "failed";

export type JutsuSourceMediaKind = "video" | "gif" | "image";

// MongoDB document in `jutsu_jobs` representing a Scro Swap motion/object/relight/color job.
export type JutsuJob = {
  _id?: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  mode: JutsuMode;
  status: JutsuJobStatus;
  sourceVideoUrl: string;
  sourceMediaKind?: JutsuSourceMediaKind;
  aspectRatio: AspectRatio;
  sectionStart: number;
  sectionLength: number;
  // Extracted raw first and last frames of the selected video section.
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  // Prepared (swapped / relit / object-edited) start and end keyframes via OpenRouter Seedream 5.0 Pro.
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  // Character / Donor reference image URL(s) (from Scro Character blueprint or 1..6 custom uploads).
  characterId?: string;
  characterName?: string;
  characterOutfitSpec?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  // Multi-person SAM 3 RLE mappings (left-to-right person targets -> Scro characters).
  personMappings?: JutsuPersonMapping[];
  allDetectedAnchors?: JutsuPersonAnchor[];
  totalDetectedPeople?: number;
  swapSubMode?: JutsuSwapSubMode;
  maxQuality?: boolean;
  role?: string;
  // Relight preset id or custom light prompt.
  relightId?: string;
  customLightPrompt?: string;
  // Object swap & SAM 3.1 mask settings
  objectEditMode?: JutsuObjectEditMode;
  objectTarget?: string;
  objectChangeTo?: string;
  placementBox?: JutsuPlacementBox;
  maskMargin?: "tight" | "normal" | "loose";
  hatFix?: boolean;
  noLipSync?: boolean;
  keepSourceOutfit?: boolean;
  motionSize?: 512 | 768 | 1376;
  // Whether finalize should mux the source section soundtrack and apply H3 Soft color grade.
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
  // SAM 3.1 Grey Mannequin motion reference MP4 & Check Mask preview MP4 (`workflows/mask.api.json`)
  mannequinVideoUrl?: string;
  checkMaskVideoUrl?: string;
  // Extracted MP3 audio track of the selected video section for MiniMax H3 `reference_audio` lip-sync.
  sectionAudioUrl?: string;
  // Two-pass VLM motion description & upsampled edit instruction.
  editPrompt?: string;
  motionDescription?: string;
  // Color grade settings (H3 soft by default).
  colorSettings?: JutsuColorSettings;
  // OpenRouter Hailuo-3 request tracking & final output video.
  openRouterRequestId?: string;
  openRouterStatusUrl?: string;
  outputVideoUrl?: string;
  outputGifUrl?: string;
  outputImageUrl?: string;
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
  creditsCharged?: number;
  creditsRefunded?: boolean;
  notifiedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicJutsuJob = {
  id: string;
  mode: JutsuMode;
  status: JutsuJobStatus;
  sourceVideoUrl: string;
  sourceMediaKind?: JutsuSourceMediaKind;
  aspectRatio: AspectRatio;
  sectionStart: number;
  sectionLength: number;
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  characterId?: string;
  characterName?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  personMappings?: JutsuPersonMapping[];
  swapSubMode?: JutsuSwapSubMode;
  maxQuality?: boolean;
  role?: string;
  relightId?: string;
  customLightPrompt?: string;
  objectEditMode?: JutsuObjectEditMode;
  objectTarget?: string;
  objectChangeTo?: string;
  placementBox?: JutsuPlacementBox;
  maskMargin?: "tight" | "normal" | "loose";
  hatFix?: boolean;
  noLipSync?: boolean;
  keepSourceOutfit?: boolean;
  motionSize?: 512 | 768 | 1376;
  mannequinVideoUrl?: string;
  checkMaskVideoUrl?: string;
  editPrompt?: string;
  motionDescription?: string;
  colorSettings?: JutsuColorSettings;
  outputVideoUrl?: string;
  outputGifUrl?: string;
  outputImageUrl?: string;
  targetVideoId?: string;
  targetClipNumber?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export function toPublicJutsuJob(
  doc: JutsuJob & { _id: ObjectId },
): PublicJutsuJob {
  return {
    id: doc._id.toHexString(),
    mode: doc.mode,
    status: doc.status,
    sourceVideoUrl: doc.sourceVideoUrl,
    sourceMediaKind: doc.sourceMediaKind,
    aspectRatio: doc.aspectRatio,
    sectionStart: doc.sectionStart,
    sectionLength: doc.sectionLength,
    rawStartFrameUrl: doc.rawStartFrameUrl,
    rawEndFrameUrl: doc.rawEndFrameUrl,
    preparedStartFrameUrl: doc.preparedStartFrameUrl,
    preparedEndFrameUrl: doc.preparedEndFrameUrl,
    characterId: doc.characterId,
    characterName: doc.characterName,
    referenceImageUrl: doc.referenceImageUrl,
    ...(doc.referenceImageUrls?.length ? { referenceImageUrls: doc.referenceImageUrls } : {}),
    personMappings: doc.personMappings,
    ...(doc.swapSubMode ? { swapSubMode: doc.swapSubMode } : {}),
    ...(doc.maxQuality !== undefined ? { maxQuality: doc.maxQuality } : {}),
    ...(doc.role ? { role: doc.role } : {}),
    relightId: doc.relightId,
    customLightPrompt: doc.customLightPrompt,
    objectEditMode: doc.objectEditMode,
    objectTarget: doc.objectTarget,
    objectChangeTo: doc.objectChangeTo,
    placementBox: doc.placementBox,
    maskMargin: doc.maskMargin,
    hatFix: doc.hatFix,
    noLipSync: doc.noLipSync,
    ...(doc.keepSourceOutfit !== undefined ? { keepSourceOutfit: doc.keepSourceOutfit } : {}),
    motionSize: doc.motionSize,
    mannequinVideoUrl: doc.mannequinVideoUrl,
    checkMaskVideoUrl: doc.checkMaskVideoUrl,
    editPrompt: doc.editPrompt,
    motionDescription: doc.motionDescription,
    colorSettings: doc.colorSettings,
    outputVideoUrl: doc.outputVideoUrl,
    outputGifUrl: doc.outputGifUrl,
    outputImageUrl: doc.outputImageUrl,
    targetVideoId: doc.targetVideoId?.toHexString(),
    targetClipNumber: doc.targetClipNumber,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
