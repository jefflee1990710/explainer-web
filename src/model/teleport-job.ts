import { ObjectId } from "mongodb";
import type { AspectRatio } from "@/model/project";

export type TeleportJobStatus = "rendering" | "completed" | "failed";

export type TeleportJob = {
  _id?: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  status: TeleportJobStatus;
  sourceVideoUrl: string;
  aspectRatio: AspectRatio;
  sectionStart: number;
  sectionLength: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
  scenePlateGenerated?: boolean;
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  identityFrameUrl?: string;
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  mannequinVideoUrl?: string;
  sectionAudioUrl?: string;
  editPrompt?: string;
  motionDescription?: string;
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
  openRouterRequestId?: string;
  openRouterStatusUrl?: string;
  outputVideoUrl?: string;
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  previousClipVideoUrl?: string;
  creditsCharged?: number;
  creditsRefunded?: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicTeleportJob = {
  id: string;
  status: TeleportJobStatus;
  sourceVideoUrl: string;
  aspectRatio: AspectRatio;
  sectionStart: number;
  sectionLength: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
  scenePlateGenerated?: boolean;
  rawStartFrameUrl?: string;
  rawEndFrameUrl?: string;
  identityFrameUrl?: string;
  preparedStartFrameUrl?: string;
  preparedEndFrameUrl?: string;
  mannequinVideoUrl?: string;
  editPrompt?: string;
  motionDescription?: string;
  outputVideoUrl?: string;
  targetVideoId?: string;
  targetClipNumber?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export function toPublicTeleportJob(doc: TeleportJob & { _id: ObjectId }): PublicTeleportJob {
  return {
    id: doc._id.toHexString(),
    status: doc.status,
    sourceVideoUrl: doc.sourceVideoUrl,
    aspectRatio: doc.aspectRatio,
    sectionStart: doc.sectionStart,
    sectionLength: doc.sectionLength,
    sceneImageUrl: doc.sceneImageUrl,
    scenePrompt: doc.scenePrompt,
    scenePlateGenerated: doc.scenePlateGenerated,
    rawStartFrameUrl: doc.rawStartFrameUrl,
    rawEndFrameUrl: doc.rawEndFrameUrl,
    identityFrameUrl: doc.identityFrameUrl,
    preparedStartFrameUrl: doc.preparedStartFrameUrl,
    preparedEndFrameUrl: doc.preparedEndFrameUrl,
    mannequinVideoUrl: doc.mannequinVideoUrl,
    editPrompt: doc.editPrompt,
    motionDescription: doc.motionDescription,
    outputVideoUrl: doc.outputVideoUrl,
    targetVideoId: doc.targetVideoId?.toHexString(),
    targetClipNumber: doc.targetClipNumber,
    error: doc.error,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
