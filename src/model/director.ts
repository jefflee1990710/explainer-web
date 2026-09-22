import { z } from "zod";

export const storyboardRowSchema = z.object({
  clipNumber: z.number().int().min(1),
  timeRange: z.string(),
  durationSeconds: z.number().min(3).max(8),
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

// One clip's video prompt (per-clip Phase B).
export const phaseBClipSchema = z.object({
  clipNumber: z.number().int().min(1),
  durationSeconds: z.number().min(3).max(8),
  prompt: z.string(),
});
