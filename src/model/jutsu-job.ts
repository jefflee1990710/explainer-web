import { ObjectId } from "mongodb";
import type { AspectRatio } from "@/model/project";

export const JUTSU_MODES = [
  "character_swap",
  "object_swap",
  "relight_video",
  "color_fix",
] as const;

export type JutsuMode = (typeof JUTSU_MODES)[number];

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
  referenceImageUrl: string;
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
  // Character / Donor reference image URL (from Scro Character blueprint or custom upload).
  characterId?: string;
  characterName?: string;
  characterOutfitSpec?: string;
  referenceImageUrl?: string;
  // Multi-person SAM 3 RLE mappings (left-to-right person targets -> Scro characters).
  personMappings?: JutsuPersonMapping[];
  allDetectedAnchors?: JutsuPersonAnchor[];
  totalDetectedPeople?: number;
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
  personMappings?: JutsuPersonMapping[];
  relightId?: string;
  customLightPrompt?: string;
  objectEditMode?: JutsuObjectEditMode;
  objectTarget?: string;
  objectChangeTo?: string;
  placementBox?: JutsuPlacementBox;
  maskMargin?: "tight" | "normal" | "loose";
  hatFix?: boolean;
  noLipSync?: boolean;
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
    personMappings: doc.personMappings,
    relightId: doc.relightId,
    customLightPrompt: doc.customLightPrompt,
    objectEditMode: doc.objectEditMode,
    objectTarget: doc.objectTarget,
    objectChangeTo: doc.objectChangeTo,
    placementBox: doc.placementBox,
    maskMargin: doc.maskMargin,
    hatFix: doc.hatFix,
    noLipSync: doc.noLipSync,
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
