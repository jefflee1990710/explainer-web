import type { ObjectId } from "mongodb";
import type { StyleId } from "@/lib/styles";
import type { CastMember } from "@/types/character";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type DurationPreset = "micro" | "short" | "punchy" | "full";
export type LoopMode = "linear" | "infinite";
// Voiceover language: American English, Hong Kong Cantonese colloquial, Traditional Chinese (Mandarin).
export type VoLanguage = "en" | "yue" | "zh";
// On-canvas labels in storyboard stills; independent of voiceover language.
export type SceneTextLanguage = "en" | "zh-Hant" | "zh-Hans";

// Lifecycle: phase_a → awaiting_approval → production → ready.
// `production` = storyboard approved; every clip's frames and video are made
// independently. Frame/video failures live on the clip, so `failed` only ever
// means Phase A failed.
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

// One storyboard still (start or end frame) for a clip; 1 credit each.
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

export type StoryboardRow = {
  clipNumber: number;
  timeRange: string;
  durationSeconds: number;
  narrativeJob: string;
  explainerScene: string;
  motionCamera: string;
  englishVo: string;
  // Legacy; no longer shown or required. Older videos may still have it.
  referenceTranslation?: string;
  bgmSfx: string;
  // ISO time the user last edited this row; newer than submittedAt ⇒ stale media.
  editedAt?: string;
};

// Storyboard fields the user may rewrite per clip while reviewing frames.
export type ClipStoryboardInput = Pick<
  StoryboardRow,
  "explainerScene" | "motionCamera" | "englishVo"
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
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  // Visual style; videos created before the registry have none → doodle.
  styleId?: StyleId;
  // Optional for legacy documents; defaults to "en" when absent.
  language?: VoLanguage;
  // Missing or false → no on-canvas labels. True + language → labels in that script.
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  characterImageUrl?: string;
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
  // Concatenated reel (step 4). Fingerprint must match current clip URLs.
  reelUrl?: string;
  reelStatus?: ReelStatus;
  reelFingerprint?: string;
  reelError?: string;
  // Legacy batch charges (pre per-clip pipeline). No longer written.
  creditCost?: number;
  creditsCharged: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};
