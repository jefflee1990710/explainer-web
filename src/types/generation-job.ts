import type { ObjectId } from "mongodb";
import type { FramePosition } from "@/types/project";

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
