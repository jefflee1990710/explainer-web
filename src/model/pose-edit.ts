import type { ObjectId } from "mongodb";
import type { PoseEditAspect } from "@/service/pose-edit/aspect";
import type { PoseEditWardrobe } from "@/service/pose-edit/selection";

export const POSE_EDIT_STATUSES = ["pending", "completed", "failed"] as const;
export type PoseEditStatus = (typeof POSE_EDIT_STATUSES)[number];

/** Persisted pose-edit job; aspect and spendKey are server-only. */
export type PoseEdit = {
  _id: ObjectId;
  clerkUserId: string;
  sourceUrl: string;
  poseId?: string;
  poseText?: string;
  outfitText?: string;
  wardrobe: PoseEditWardrobe;
  aspect: PoseEditAspect;
  status: PoseEditStatus;
  resultUrl?: string;
  error?: string;
  spendKey?: string;
  /** True when created on the free welcome tier (1k resolution + Scro.io watermark). */
  freeTier?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
