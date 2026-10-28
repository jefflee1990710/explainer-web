import { z } from "zod";
import type { SystemProfile } from "@/model/director-profile";
import type { SystemPerformance } from "@/model/director-performance";
import type {
  HiggsfieldDefaults,
  SkillInputSchema,
  SkillReference,
} from "@/model/skill";

export const storyboardRowSchema = z.object({
  clipNumber: z.number().int().min(1),
  timeRange: z.string(),
  durationSeconds: z.number().min(5).max(12),
  narrativeJob: z.string(),
  explainerScene: z.string(),
  motionCamera: z.string(),
  englishVo: z.string(),
  startScene: z.string().optional(),
  endScene: z.string().optional(),
  startVo: z.string().optional(),
  endVo: z.string().optional(),
  referenceTranslation: z.string().optional(),
  referenceImageIds: z.array(z.string()).optional(),
  styleId: z.string().optional(),
  bgmSfx: z.string(),
});

export const dualBeatStoryboardRowSchema = storyboardRowSchema.extend({
  startScene: z.string().min(1),
  endScene: z.string().min(1),
  startVo: z.string().min(1),
  endVo: z.string().min(1),
});

export const phaseASchema = z.object({
  englishTitle: z.string(),
  localizedTitle: z.string(),
  targetDuration: z.string(),
  clipCount: z.number().int().min(1),
  loopMode: z.enum(["linear", "infinite"]),
  coreMessage: z.string(),
  hookStrategy: z.string(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  visualWorld: z.string(),
  narrator: z.string(),
  englishWordCount: z.number().int().min(1),
  characterLock: z.string(),
  palette: z.string(),
  bgmDirection: z.string(),
  narrativeArc: z.string(),
  clips: z.array(storyboardRowSchema).min(1),
});

export const cartoonPhaseASchema = phaseASchema.extend({
  clips: z.array(dualBeatStoryboardRowSchema).min(1),
});

// Cinematic realistic whiteboard: one opening still and the camera move. No end still.
export const startOnlyStoryboardRowSchema = storyboardRowSchema.extend({
  startScene: z.string().min(1),
  endScene: z.string().optional(),
  startVo: z.string().min(1),
  endVo: z.string().min(1),
});

export const startOnlyPhaseASchema = phaseASchema.extend({
  clips: z.array(startOnlyStoryboardRowSchema).min(1),
});

// Talking-head clips can run up to 120s on HeyGen Avatar IV (total script <= 240s enforced in talkingHeadPlanError).
export const talkingHeadPhaseASchema = phaseASchema.extend({
  clips: z.array(storyboardRowSchema.extend({ durationSeconds: z.number().min(5).max(120) })).min(1),
});

// One clip's video prompt (per-clip Phase B).
export const phaseBClipSchema = z.object({
  clipNumber: z.number().int().min(1),
  durationSeconds: z.number().min(5).max(120),
  prompt: z.string(),
});

export const DIRECTOR_SLUGS = [
  "cartoon-explainer-video-director",
  "paper-cutout-explainer-video-director",
  "story-short-director",
  "product-demo-director",
  "dialogue-qa-director",
  "listicle-director",
  "tutorial-director",
  "opening-director",
  "ending-director",
  "talking-head-director",
  "full-body-talking-head-director",
  "comparison-card-director",
  "talking-broll-director",
  "surprise-interview-director",
  "outfit-reel-director",
  "follow-shot-director",
  "outfit-change-director",
  "workflow-promo-director",
  "style-switch-director",
] as const;

export type DirectorSlug = (typeof DIRECTOR_SLUGS)[number];

export const DEFAULT_DIRECTOR_SLUG: DirectorSlug = "cartoon-explainer-video-director";

export function isDirectorSlug(value: string | undefined | null): value is DirectorSlug {
  return Boolean(value && (DIRECTOR_SLUGS as readonly string[]).includes(value));
}

export type DirectorKeyframeMode = "start-only" | "end-is-next-start";
export type DirectorSpeechMode = "narrator" | "lip-sync" | "silent";

export interface IDirectorBehavior {
  /**
   * Keyframe generation strategy:
   * - "start-only": only the start still is generated; video renders from start still + motion prompt.
   * - "end-is-next-start": each clip generates a start still; clip N uses clip N+1's start still as its end keyframe (only the final clip generates its own end still).
   */
  keyframeMode: DirectorKeyframeMode;
  /** Whether Clip 2+ continues from the previous clip's ending pose/framing. */
  chainsClipStarts: boolean;
  /** Whether Clip 2+ frame generation attaches Clip 1's start still as a visual anchor. */
  anchorsFramesToFirstClip: boolean;
  /** Whether each clip has two beats (Start/End scene + startVo/endVo). */
  dualBeat: boolean;
  /** Maximum number of 3x3 background plates planned in Video Locks (1 for single-room directors, 4 otherwise). */
  maxBackgroundSets: number;
  /** How characters and voiceover behave in clips ("narrator" | "lip-sync" | "silent"). */
  speechMode: DirectorSpeechMode;
  /** Whether third-person narration is forbidden (hides VoicePicker in UI). */
  bansNarration: boolean;
  /** Required number of cast characters in the brief (1 or 2). */
  requiredCastCount: 1 | 2;
  /** Talking-head framing mode when part of the talking-head family. */
  talkingHeadShot?: "face" | "full-body";
  /** Whether realistic style switches to modern creator cameras (iPhone 16 Pro / Sony ZV-E1) and skips vintage 35mm film grain grading. */
  selfShotCreatorCamera: boolean;
  /** Whether on-screen scene text is forced ON (e.g., listicle). */
  forcesSceneText: boolean;
  /** Whether short in-world diagram labels in 「」 are still allowed when scene text is OFF. */
  allowsInWorldLabels: boolean;
  /** Whether frame generation attaches the selected text-style reference image. */
  attachesTextStyleReference: boolean;
  /** Maximum number of visual styles selectable for a single video (1 for single-style directors, 4 for multi-style switching). */
  maxStyleCount: number;
  /** Bookend role when the director is an opening or ending sting. */
  bookendRole?: "opening" | "ending";
  /** Brief form capabilities: spoken script input, room background upload, opening photo upload, brand logo upload, hidden in picker. */
  requiresSpokenScript: boolean;
  allowsRoomBackgroundUpload: boolean;
  allowsOpeningPhotoUpload: boolean;
  allowsBrandLogoUpload: boolean;
  hiddenInPicker: boolean;
}

export interface IDirector {
  /** Fixed 24-hex id preserved from the system seed so existing video documents still match. Stored as a string so client bundles never import mongodb. */
  _id: string;
  slug: DirectorSlug;
  title: string;
  description: string;
  /** Concrete scenarios, formats, and topics this director is best suited for. */
  suggestedUseCase: string;
  sortOrder: number;
  isActive: boolean;
  previewUrl?: string;
  inputSchema: SkillInputSchema;
  higgsfieldDefaults: HiggsfieldDefaults;
  systemPrompt: string;
  references: SkillReference[];
  profile?: SystemProfile;
  performance?: SystemPerformance;
  behavior: IDirectorBehavior;
  createdAt: Date;
  updatedAt: Date;
}
