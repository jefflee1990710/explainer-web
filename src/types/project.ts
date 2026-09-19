import type { ObjectId } from "mongodb";
import type { StyleId } from "@/lib/styles";
import type { CastMember } from "@/types/character";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type DurationPreset = "micro" | "short" | "punchy" | "full";
export type LoopMode = "linear" | "infinite";
// Voiceover language: American English, Hong Kong Cantonese colloquial, Traditional Chinese (Mandarin).
export type VoLanguage = "en" | "yue" | "zh";

// Lifecycle:
// phase_a → awaiting_approval → frames_generating → frames_ready → approved → generating → ready
export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "frames_generating"
  | "frames_ready"
  | "approved"
  | "generating"
  | "ready"
  | "failed";

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
};

export type StoryboardRow = {
  clipNumber: number;
  timeRange: string;
  durationSeconds: number;
  narrativeJob: string;
  explainerScene: string;
  motionCamera: string;
  englishVo: string;
  referenceTranslation: string;
  bgmSfx: string;
};

// Storyboard fields the user may rewrite per clip while reviewing frames.
export type ClipStoryboardInput = Pick<
  StoryboardRow,
  "explainerScene" | "motionCamera" | "englishVo" | "referenceTranslation"
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
};

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
  characterImageUrl?: string;
  // Characters chosen at creation; snapshot of each default blueprint.
  cast?: CastMember[];
  status: ProjectStatus;
  phaseA?: PhaseAProposal;
  phaseB?: PhaseBPackage;
  characterStillUrl?: string;
  // Storyboard frames generated after storyboard approval.
  frames?: ClipFrame[];
  framesCreditCost?: number;
  framesCharged?: boolean;
  // Set once frame jobs have been submitted (guards against double submit).
  framesSubmittedAt?: Date;
  clips: ProjectClip[];
  // Video credits (charged on final approval).
  creditCost: number;
  creditsCharged: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};
