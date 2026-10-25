import type { ObjectId } from "mongodb";
import { poseEditsCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { persistMedia } from "@/service/higgsfield/persist";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import { poseEditFailureFilter, poseEditShouldRefund } from "@/service/pose-edit/fail";

// Claim a pending edit, store the short error, and refund the frame credit once.
export async function failPoseEdit(id: ObjectId, error: string) {
  const edits = await poseEditsCollection();
  const existing = await edits.findOne({ _id: id });
  if (!existing || existing.status === "completed") return;
  const spendKey = existing.spendKey;
  const claimed = await edits.updateOne(poseEditFailureFilter(id), {
    $set: { status: "failed", error, updatedAt: new Date() },
    $unset: { spendKey: "" },
  });
  if (!poseEditShouldRefund(claimed.modifiedCount) || !spendKey) return;
  try {
    await refundCredits(existing.clerkUserId, FRAME_COST, spendKey);
  } catch (refundError) {
    // Put the charge back so a later failure can refund it.
    await edits.updateOne(
      { _id: id },
      {
        $set: { spendKey, status: "pending", updatedAt: new Date() },
        $unset: { error: "" },
      },
    );
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
