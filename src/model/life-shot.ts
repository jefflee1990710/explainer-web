import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export const LIFE_SHOT_KINDS = ["selfie", "food", "street", "hobby"] as const;
export const LIFE_SHOT_SOURCES = ["search", "upload"] as const;

export type LifeShotKind = (typeof LIFE_SHOT_KINDS)[number];
export type LifeShotSource = (typeof LIFE_SHOT_SOURCES)[number];

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
  createdAt: z.date(),
});
