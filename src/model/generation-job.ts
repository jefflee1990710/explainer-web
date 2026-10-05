import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import type { FramePosition } from "@/model/project";

export type GenerationKind =
  | "still"
  | "frame"
  | "video"
  | "character"
  | "stylePreview"
  | "directorPreview"
  | "reelCover";
export type GenerationStatus =
  // Waiting in our queue; not sent to the provider yet.
  | "pending"
  // A runner holds the lock and is sending it now.
  | "submitting"
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
  // Portrait follow-up. Absent means the blueprint sheet itself.
  characterSlot?: "profile";
  // Only for kind === "stylePreview".
  userStyleId?: ObjectId;
  // Only for kind === "directorPreview".
  skillId?: ObjectId;
  model: string;
  // Unset until the provider accepts the request.
  requestId?: string;
  statusUrl?: string;
  status: GenerationStatus;
  // Submit attempts so far (queue retries stop at MAX_SUBMIT_ATTEMPTS).
  attempts?: number;
  // A `submitting` job whose lock expired can be claimed again.
  lockedUntil?: Date;
  // Earliest time a `pending` job may be retried.
  nextAttemptAt?: Date;
  // Parked until the still it depends on exists: this clip's start, or the previous end.
  awaits?: "start" | "prev-end";
  // When the provider accepted it; drives the provider timeout.
  submittedAt?: Date;
  outputUrl?: string;
  blobUrl?: string;
  error?: string;
  // Set after the finish email is claimed so webhook + poller send once.
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const generationJobSchema: z.ZodType<GenerationJob> = z.object({
  _id: objectIdSchema,
  projectId: objectIdSchema.optional(),
  clipIndex: z.number(),
  kind: z.enum(["still", "frame", "video", "character", "stylePreview", "directorPreview", "reelCover"]),
  framePosition: z.enum(["start", "end"]).optional(),
  characterId: objectIdSchema.optional(),
  versionId: objectIdSchema.optional(),
  characterSlot: z.enum(["profile"]).optional(),
  userStyleId: objectIdSchema.optional(),
  skillId: objectIdSchema.optional(),
  model: z.string(),
  requestId: z.string().optional(),
  statusUrl: z.string().optional(),
  status: z.enum([
    "pending",
    "submitting",
    "queued",
    "in_progress",
    "completed",
    "failed",
    "nsfw",
  ]),
  attempts: z.number().optional(),
  lockedUntil: z.date().optional(),
  nextAttemptAt: z.date().optional(),
  awaits: z.enum(["start", "prev-end"]).optional(),
  submittedAt: z.date().optional(),
  outputUrl: z.string().optional(),
  blobUrl: z.string().optional(),
  error: z.string().optional(),
  notifiedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
