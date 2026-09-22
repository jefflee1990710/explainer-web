import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import type { FramePosition } from "@/model/project";

export type GenerationKind = "still" | "frame" | "video" | "character";
export type GenerationStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";

// One Higgsfield request tied to a video clip / frame / still, or a character version.
export type GenerationJob = {
  _id: ObjectId;
  // Video id for still/frame/video jobs; unset for character jobs.
  projectId?: ObjectId;
  clipIndex: number;
  kind: GenerationKind;
  // Only for kind === "frame".
  framePosition?: FramePosition;
  // Only for kind === "character".
  characterId?: ObjectId;
  versionId?: ObjectId;
  model: string;
  requestId: string;
  statusUrl?: string;
  status: GenerationStatus;
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const generationJobSchema: z.ZodType<GenerationJob> = z.object({
  _id: objectIdSchema,
  projectId: objectIdSchema.optional(),
  clipIndex: z.number(),
  kind: z.enum(["still", "frame", "video", "character"]),
  framePosition: z.enum(["start", "end"]).optional(),
  characterId: objectIdSchema.optional(),
  versionId: objectIdSchema.optional(),
  model: z.string(),
  requestId: z.string(),
  statusUrl: z.string().optional(),
  status: z.enum(["queued", "in_progress", "completed", "failed", "nsfw"]),
  outputUrl: z.string().optional(),
  blobUrl: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
