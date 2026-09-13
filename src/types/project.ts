import type { ObjectId } from "mongodb";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type DurationPreset = "micro" | "short" | "punchy" | "full";
export type LoopMode = "linear" | "infinite";

export type ProjectStatus =
  | "draft"
  | "phase_a"
  | "awaiting_approval"
  | "approved"
  | "generating"
  | "ready"
  | "failed";

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
  skillId: ObjectId;
  skillSlug: string;
  source: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  characterImageUrl?: string;
  status: ProjectStatus;
  phaseA?: PhaseAProposal;
  phaseB?: PhaseBPackage;
  characterStillUrl?: string;
  clips: ProjectClip[];
  creditCost: number;
  creditsCharged: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};
