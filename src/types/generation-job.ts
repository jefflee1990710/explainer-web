import type { ObjectId } from "mongodb";
import type { FramePosition } from "@/types/project";

export type GenerationKind = "still" | "frame" | "video";
export type GenerationStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";

// One Higgsfield request tied to a project clip, storyboard frame, or character still.
export type GenerationJob = {
  _id: ObjectId;
  projectId: ObjectId;
  clipIndex: number;
  kind: GenerationKind;
  // Only for kind === "frame".
  framePosition?: FramePosition;
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
