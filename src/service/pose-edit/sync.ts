import type { Filter, ObjectId, OptionalId, UpdateFilter } from "mongodb";
import { poseEditsCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { PoseEdit } from "@/model/pose-edit";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { persistMedia } from "@/service/higgsfield/persist";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import {
  poseEditFailedSpendFilter,
  poseEditFailedSpendQuery,
  poseEditFailureFilter,
  poseEditRefundRestoreFilter,
  poseEditShouldRefund,
} from "@/service/pose-edit/fail";

type PoseEditRows = {
  findOne(filter: object): Promise<PoseEdit | null>;
  updateOne(filter: object, update: object): Promise<{ modifiedCount: number }>;
};

export type PoseEditSyncDeps = {
  rows?: () => Promise<PoseEditRows>;
  refund?: (clerkUserId: string, cost: number, spendKey: string) => Promise<void>;
};

async function poseEditRows(deps?: PoseEditSyncDeps): Promise<PoseEditRows> {
  if (deps?.rows) return deps.rows();
  const edits = await poseEditsCollection();
  return {
    async findOne(filter) {
      const doc = await edits.findOne(filter as Filter<OptionalId<PoseEdit>>);
      return (doc as PoseEdit | null) ?? null;
    },
    async updateOne(filter, update) {
      const result = await edits.updateOne(
        filter as Filter<OptionalId<PoseEdit>>,
        update as UpdateFilter<OptionalId<PoseEdit>>,
      );
      return { modifiedCount: result.modifiedCount };
    },
  };
}

// The generation job is already finished, so a failed refund must leave the edit failed.
async function restoreFailedSpendKey(rows: PoseEditRows, id: ObjectId, spendKey: string) {
  await rows.updateOne(poseEditRefundRestoreFilter(id), {
    $set: { spendKey, updatedAt: new Date() },
  });
}

// Claim a pending edit, store the short error, and refund the frame credit once.
export async function failPoseEdit(id: ObjectId, error: string, deps?: PoseEditSyncDeps) {
  const rows = await poseEditRows(deps);
  const refund = deps?.refund ?? refundCredits;
  const existing = await rows.findOne({ _id: id });
  if (!existing || existing.status === "completed") return;
  const spendKey = existing.spendKey;
  const claimed = await rows.updateOne(poseEditFailureFilter(id), {
    $set: { status: "failed", error, updatedAt: new Date() },
    $unset: { spendKey: "" },
  });
  if (!poseEditShouldRefund(claimed.modifiedCount) || !spendKey) return;
  try {
    await refund(existing.clerkUserId, FRAME_COST, spendKey);
  } catch {
    await restoreFailedSpendKey(rows, id, spendKey);
    await refundFailedPoseEdit(id, deps);
  }
}

// One refund for a failed row that still holds its spend key. The conditional unset is the only double-refund guard.
export async function refundFailedPoseEdit(id: ObjectId, deps?: PoseEditSyncDeps) {
  const rows = await poseEditRows(deps);
  const refund = deps?.refund ?? refundCredits;
  const existing = await rows.findOne(poseEditFailedSpendQuery(id));
  if (!existing || existing.status !== "failed" || !existing.spendKey) return;
  const spendKey = existing.spendKey;
  const claimed = await rows.updateOne(poseEditFailedSpendFilter(id, spendKey), {
    $unset: { spendKey: "" },
    $set: { updatedAt: new Date() },
  });
  if (!poseEditShouldRefund(claimed.modifiedCount)) return;
  try {
    await refund(existing.clerkUserId, FRAME_COST, spendKey);
  } catch (refundError) {
    await restoreFailedSpendKey(rows, id, spendKey);
    throw refundError;
  }
}

// Copy provider status onto the pose edit. In-flight statuses stay pending.
export async function syncPoseEditJob(
  job: Pick<GenerationJob, "poseEditId">,
  status: GenerationStatus,
  outputUrl?: string,
) {
  const id = job.poseEditId;
  if (!id) return;
  if (status === "nsfw") {
    await failPoseEdit(id, POSE_EDIT_ERRORS.nsfw);
    return;
  }
  if (status === "failed") {
    await failPoseEdit(id, POSE_EDIT_ERRORS.failed);
    return;
  }
  if (status !== "completed" || !outputUrl) return;

  let resultUrl: string;
  try {
    resultUrl = await persistMedia(outputUrl, `explainer/pose-edits/${id.toHexString()}/result`);
  } catch {
    await failPoseEdit(id, POSE_EDIT_ERRORS.failed);
    return;
  }

  const edits = await poseEditsCollection();
  // Only a still-pending edit can complete. A refunded failure stays failed.
  await edits.updateOne(
    { _id: id, status: "pending" },
    {
      $set: { status: "completed", resultUrl, updatedAt: new Date() },
      $unset: { spendKey: "", error: "" },
    },
  );
}
