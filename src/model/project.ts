import type { ObjectId } from "mongodb";
import { z } from "zod";
import { castMemberSchema, type CastMember } from "@/model/character";
import { objectIdSchema } from "@/model/primitives";
import { styleIdSchema, type StyleId } from "@/model/style-id";
import { videoEditSchema, type VideoEdit } from "@/model/video-edit";

export type AspectRatio = "16:9" | "9:16" | "1:1";
// auto: Phase A picks length and clip count. The others are fixed clip budgets.
export const DURATION_PRESET_IDS = ["auto", "micro", "short", "punchy", "full"] as const;
export type DurationPreset = (typeof DURATION_PRESET_IDS)[number];
export type LoopMode = "linear" | "infinite";
// Voiceover language: American English, Hong Kong Cantonese colloquial, Traditional Chinese (Mandarin).
export type VoLanguage = "en" | "yue" | "zh";
// Narrator / spoken-voice gender chosen on the input step.
export type VoiceGender = "male" | "female";
// How fast the narrator / characters speak; scales the spoken-word budget.
export type SpeechPace = "slow" | "medium" | "fast";
// On-canvas labels in storyboard stills; independent of voiceover language.
export type SceneTextLanguage = "en" | "zh-Hant" | "zh-Hans";

// Lifecycle: phase_a → production → ready.
// `awaiting_approval` remains for leftover videos; the UI treats it as production.
// Every clip's frames and video are made independently. Frame/video failures
// live on the clip, so `failed` only ever means Phase A failed.
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "production"
  | "ready"
  | "failed";

// Written by the pre per-clip pipeline; still present in Mongo. Normalised to
// `production` by normalizeProjectStatus() on every read.
export type LegacyProjectStatus =
  | "frames_generating"
  | "frames_ready"
  | "approved"
  | "generating";

export type FramePosition = "start" | "end";

// Director's revision for a frame redo: free-text remark and/or the previous
// image with hand-drawn markings baked in (uploaded to Blob).
export type FrameRevision = {
  remark?: string;
  annotatedUrl?: string;
};

// What the edit dialog sends when asking for a redo: the remark plus the
// transparent sketch layer (PNG data URL) drawn over the current frame.
export type FrameRevisionInput = {
  remark?: string;
  sketchDataUrl?: string;
};

// One storyboard still (start or end frame) for a clip; FRAME_COST credits each.
export type ClipFrame = {
  clipNumber: number;
  position: FramePosition;
  prompt: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  // Revision used for the most recent redo (kept so the dialog can show it).
  revision?: FrameRevision;
  // ISO time the current job was submitted; compared with the row's editedAt.
  submittedAt?: string;
};

// User-supplied scene reference for the director. Max 4 per video, ids R1..R4.
export type ReferenceImage = {
  id: string;
  url: string;
  description: string;
};

export type StoryboardRow = {
  clipNumber: number;
  timeRange: string;
  durationSeconds: number;
  narrativeJob: string;
  explainerScene: string;
  motionCamera: string;
  englishVo: string;
  // 白板概念解說 dual-beat: dedicated stills + two spoken lines.
  startScene?: string;
  endScene?: string;
  startVo?: string;
  endVo?: string;
  // Legacy; no longer shown or required. Older videos may still have it.
  referenceTranslation?: string;
  bgmSfx: string;
  // Reference images (R1..R4) the director assigned to this clip's stills.
  referenceImageIds?: string[];
  // ISO time the user last edited this row; newer than submittedAt ⇒ stale media.
  editedAt?: string;
};

// Storyboard fields the user may rewrite per clip while reviewing frames.
export type ClipStoryboardInput = Pick<
  StoryboardRow,
  "explainerScene" | "motionCamera" | "englishVo" | "startScene" | "endScene" | "startVo" | "endVo"
>;

// Phase A proposal fields the user can rewrite before approving frames.
export type PhaseAEditInput = {
  localizedTitle: string;
  englishTitle: string;
  coreMessage: string;
  hookStrategy: string;
  narrator: string;
  visualWorld: string;
  clips: Array<{ clipNumber: number } & ClipStoryboardInput>;
};

export type PhaseAProposal = {
  englishTitle: string;
  localizedTitle: string;
  targetDuration: string;
  clipCount: number;
  loopMode: LoopMode;
  coreMessage: string;
  hookStrategy: string;
  aspectRatio: AspectRatio;
  visualWorld: string;
  narrator: string;
  englishWordCount: number;
  characterLock: string;
  palette: string;
  bgmDirection: string;
  narrativeArc: string;
  clips: StoryboardRow[];
};

export type PhaseBPrompt = {
  clipNumber: number;
  durationSeconds: number;
  prompt: string;
};

export type PhaseBPackage = {
  globalContinuity: string;
  prompts: PhaseBPrompt[];
  stitchingGuide: string;
  voiceMusicNote: string;
};

export type ProjectClip = {
  clipNumber: number;
  durationSeconds: number;
  prompt: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  // ISO time the video was requested (Phase B + submit happen in a job).
  submittedAt?: string;
  // Credits taken for the current attempt, so a refund returns the same amount.
  creditsCharged?: number;
};

// Concatenated reel of every storyboard clip, produced on the export step.
export type ReelStatus = "queued" | "in_progress" | "completed" | "failed";

// One explainer job owned by a signed-in user.
export type Project = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  // Parent folder. Required for new videos; set by migration for legacy rows.
  projectId: ObjectId;
  skillId: ObjectId;
  skillSlug: string;
  source: string;
  // Talking-head: words the character reads. Other skills omit this.
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  // Visual style; videos created before the registry have none → doodle.
  styleId?: StyleId;
  // Optional for legacy documents; defaults to "en" when absent.
  language?: VoLanguage;
  // Optional for legacy documents; defaults to male when absent.
  voiceGender?: VoiceGender;
  // Optional for legacy documents; defaults to medium when absent.
  speechPace?: SpeechPace;
  // Missing or false → no on-canvas labels. True + language → labels in that script.
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  characterImageUrl?: string;
  // Opening / Ending bookends: brand logo used as a reference in every still.
  logoUrl?: string;
  // Scene references from the brief; the director assigns them per clip.
  referenceImages?: ReferenceImage[];
  // Characters chosen at creation; snapshot of each default blueprint.
  cast?: CastMember[];
  status: ProjectStatus | LegacyProjectStatus;
  phaseA?: PhaseAProposal;
  phaseB?: PhaseBPackage;
  characterStillUrl?: string;
  // Character still failed; the next frame request resubmits it.
  stillError?: string;
  // Storyboard frames generated after storyboard approval.
  frames?: ClipFrame[];
  // Legacy batch charges (pre per-clip pipeline). No longer written.
  framesCreditCost?: number;
  framesCharged?: boolean;
  // Set once frame jobs have been submitted (guards against double submit).
  framesSubmittedAt?: Date;
  clips: ProjectClip[];
  // Clips that should start a video once both scene images exist.
  autoVideoClips?: number[];
  // Concatenated reel (step 4). Fingerprint must match current clip URLs.
  reelUrl?: string;
  reelStatus?: ReelStatus;
  reelFingerprint?: string;
  reelError?: string;
  // Compose tries for the current fingerprint. A dead worker retries until the cap.
  reelAttempts?: number;
  // Branding edit for the Video tab (copy, never linked to the template).
  edit?: VideoEdit;
  // Template last applied to or saved from this video.
  editTemplateId?: ObjectId;
  // Branded export. Fingerprint = reel fingerprint + edit hash.
  finalUrl?: string;
  finalStatus?: ReelStatus;
  finalFingerprint?: string;
  finalError?: string;
  // When the current export was queued; a stale one can be re-queued.
  finalQueuedAt?: Date;
  // Legacy batch charges (pre per-clip pipeline). No longer written.
  creditCost?: number;
  creditsCharged: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);
const frameStatusSchema = z.enum(["queued", "in_progress", "completed", "failed"]);

const frameRevisionSchema = z.object({
  remark: z.string().optional(),
  annotatedUrl: z.string().optional(),
});

const storyboardRowSchema = z.object({
  clipNumber: z.number(),
  timeRange: z.string(),
  durationSeconds: z.number(),
  narrativeJob: z.string(),
  explainerScene: z.string(),
  motionCamera: z.string(),
  englishVo: z.string(),
  startScene: z.string().optional(),
  endScene: z.string().optional(),
  startVo: z.string().optional(),
  endVo: z.string().optional(),
  referenceTranslation: z.string().optional(),
  bgmSfx: z.string(),
  referenceImageIds: z.array(z.string()).optional(),
  editedAt: z.string().optional(),
});

const phaseAProposalSchema = z.object({
  englishTitle: z.string(),
  localizedTitle: z.string(),
  targetDuration: z.string(),
  clipCount: z.number(),
  loopMode: z.enum(["linear", "infinite"]),
  coreMessage: z.string(),
  hookStrategy: z.string(),
  aspectRatio: aspectRatioSchema,
  visualWorld: z.string(),
  narrator: z.string(),
  englishWordCount: z.number(),
  characterLock: z.string(),
  palette: z.string(),
  bgmDirection: z.string(),
  narrativeArc: z.string(),
  clips: z.array(storyboardRowSchema),
});

export const projectSchema: z.ZodType<Project> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  projectId: objectIdSchema,
  skillId: objectIdSchema,
  skillSlug: z.string(),
  source: z.string(),
  spokenScript: z.string().optional(),
  aspectRatio: aspectRatioSchema,
  durationPreset: z.enum(DURATION_PRESET_IDS),
  styleId: styleIdSchema.optional(),
  language: z.enum(["en", "yue", "zh"]).optional(),
  voiceGender: z.enum(["male", "female"]).optional(),
  speechPace: z.enum(["slow", "medium", "fast"]).optional(),
  sceneTextEnabled: z.boolean().optional(),
  sceneTextLanguage: z.enum(["en", "zh-Hant", "zh-Hans"]).optional(),
  characterImageUrl: z.string().optional(),
  logoUrl: z.string().optional(),
  referenceImages: z
    .array(z.object({ id: z.string(), url: z.string(), description: z.string() }))
    .optional(),
  cast: z.array(castMemberSchema).optional(),
  status: z.enum([
    "draft",
    "phase_a",
    "awaiting_approval",
    "production",
    "ready",
    "failed",
    "frames_generating",
    "frames_ready",
    "approved",
    "generating",
  ]),
  phaseA: phaseAProposalSchema.optional(),
  phaseB: z
    .object({
      globalContinuity: z.string(),
      prompts: z.array(
        z.object({
          clipNumber: z.number(),
          durationSeconds: z.number(),
          prompt: z.string(),
        }),
      ),
      stitchingGuide: z.string(),
      voiceMusicNote: z.string(),
    })
    .optional(),
  characterStillUrl: z.string().optional(),
  stillError: z.string().optional(),
  frames: z
    .array(
      z.object({
        clipNumber: z.number(),
        position: z.enum(["start", "end"]),
        prompt: z.string(),
        status: frameStatusSchema,
        outputUrl: z.string().optional(),
        blobUrl: z.string().optional(),
        error: z.string().optional(),
        revision: frameRevisionSchema.optional(),
        submittedAt: z.string().optional(),
      }),
    )
    .optional(),
  framesCreditCost: z.number().optional(),
  framesCharged: z.boolean().optional(),
  framesSubmittedAt: z.date().optional(),
  clips: z.array(
    z.object({
      clipNumber: z.number(),
      durationSeconds: z.number(),
      prompt: z.string(),
      status: frameStatusSchema,
      outputUrl: z.string().optional(),
      blobUrl: z.string().optional(),
      error: z.string().optional(),
      submittedAt: z.string().optional(),
      creditsCharged: z.number().optional(),
    }),
  ),
  reelUrl: z.string().optional(),
  reelStatus: z.enum(["queued", "in_progress", "completed", "failed"]).optional(),
  reelFingerprint: z.string().optional(),
  reelError: z.string().optional(),
  reelAttempts: z.number().optional(),
  edit: videoEditSchema.optional(),
  editTemplateId: objectIdSchema.optional(),
  finalUrl: z.string().optional(),
  finalStatus: z.enum(["queued", "in_progress", "completed", "failed"]).optional(),
  finalFingerprint: z.string().optional(),
  finalError: z.string().optional(),
  finalQueuedAt: z.date().optional(),
  creditCost: z.number().optional(),
  creditsCharged: z.boolean(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
