import type { ObjectId } from "mongodb";

export type GenerationKind = "still" | "video";
export type GenerationStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "nsfw";

// One Higgsfield request tied to a project clip or character still.
export type GenerationJob = {
  _id: ObjectId;
  projectId: ObjectId;
  clipIndex: number;
  kind: GenerationKind;
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
