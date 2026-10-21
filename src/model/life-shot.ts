import type { ObjectId } from "mongodb";
import { z } from "zod";
import {
  LIFE_SHOT_KINDS,
  LIFE_SHOT_SOURCES,
  type LifeShotKind,
  type LifeShotSource,
} from "@/model/life-shot-kind";
import { objectIdSchema } from "@/model/primitives";

export { LIFE_SHOT_KINDS, LIFE_SHOT_SOURCES, type LifeShotKind, type LifeShotSource };

export const LIFE_SHOT_STATUSES = ["generating", "completed", "failed"] as const;
export type LifeShotStatus = (typeof LIFE_SHOT_STATUSES)[number];
export const lifeShotStatusSchema = z.enum(LIFE_SHOT_STATUSES);

// A generated day-in-the-life still. Not a blueprint version.
export type LifeShot = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  characterId: ObjectId;
  characterName: string;
  place: string;
  kind: LifeShotKind;
  source: LifeShotSource;
  sceneImageUrl: string;
  resultUrl: string;
  status?: LifeShotStatus;
  error?: string;
  spendKey?: string;
  // Post-type template id from LIFE_POST_TEMPLATES, and the optional pose/framing reference.
  templateId?: string;
  compositionRefUrl?: string;
  // Pose library id from LIFE_POSES.
  poseId?: string;
  createdAt: Date;
};

export const lifeShotKindSchema = z.enum(LIFE_SHOT_KINDS);
export const lifeShotSourceSchema = z.enum(LIFE_SHOT_SOURCES);

export const lifeShotSchema: z.ZodType<LifeShot> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  characterId: objectIdSchema,
  characterName: z.string(),
  place: z.string(),
  kind: lifeShotKindSchema,
  source: lifeShotSourceSchema,
  sceneImageUrl: z.string(),
  resultUrl: z.string(),
  status: lifeShotStatusSchema.optional(),
  error: z.string().optional(),
  spendKey: z.string().optional(),
  templateId: z.string().optional(),
  compositionRefUrl: z.string().optional(),
  poseId: z.string().optional(),
  createdAt: z.date(),
});
