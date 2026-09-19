import { z } from "zod";

export const storyboardRowSchema = z.object({
  clipNumber: z.number().int().min(1),
  timeRange: z.string(),
  durationSeconds: z.number().min(3).max(8),
  narrativeJob: z.string(),
  explainerScene: z.string(),
  motionCamera: z.string(),
  englishVo: z.string(),
  referenceTranslation: z.string().optional(),
  bgmSfx: z.string(),
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

// One clip's video prompt (per-clip Phase B).
export const phaseBClipSchema = z.object({
  clipNumber: z.number().int().min(1),
  durationSeconds: z.number().min(3).max(8),
  prompt: z.string(),
});
