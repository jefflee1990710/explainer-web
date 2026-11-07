import { ObjectId } from "mongodb";
import type { AspectRatio } from "@/model/project";

export type ExtendJobStatus = "rendering" | "completed" | "failed";

export type ExtendJob = {
  _id?: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  status: ExtendJobStatus;
  sourceVideoUrl: string;
  sourceDurationSeconds: number;
  aspectRatio: AspectRatio;
  prompt: string;
  characterImageUrls?: string[];
  sceneImageUrl?: string;
  propImageUrls?: string[];
  posterFrameUrl?: string;
  applyColorFix?: boolean;
  openRouterRequestId?: string;
  openRouterStatusUrl?: string;
  outputVideoUrl?: string;
  targetVideoId: ObjectId;
  targetClipNumber: number;
  creditsCharged?: number;
  creditsRefunded?: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicExtendJob = {
  id: string;
  status: ExtendJobStatus;
  sourceVideoUrl: string;
  sourceDurationSeconds: number;
  aspectRatio: AspectRatio;
  prompt: string;
  characterImageUrls?: string[];
  sceneImageUrl?: string;
  propImageUrls?: string[];
  posterFrameUrl?: string;
  outputVideoUrl?: string;
  targetVideoId: string;
  targetClipNumber: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export function toPublicExtendJob(doc: ExtendJob & { _id: ObjectId }): PublicExtendJob {
  return {
    id: doc._id.toHexString(),
    status: doc.status,
    sourceVideoUrl: doc.sourceVideoUrl,
    sourceDurationSeconds: doc.sourceDurationSeconds,
    aspectRatio: doc.aspectRatio,
    prompt: doc.prompt,
    characterImageUrls: doc.characterImageUrls,
    sceneImageUrl: doc.sceneImageUrl,
    propImageUrls: doc.propImageUrls,
    posterFrameUrl: doc.posterFrameUrl,
    outputVideoUrl: doc.outputVideoUrl,
    targetVideoId: doc.targetVideoId.toHexString(),
    targetClipNumber: doc.targetClipNumber,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
