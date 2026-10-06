import { postsCollection } from "@/dao/posts";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { persistBuffer } from "@/service/higgsfield/persist";
import { shouldRefundPreview } from "@/service/post/preview-policy";

// Land a post preview on the poster, or refund the attempt when it fails.
export async function syncPostPreviewJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (job.kind !== "postPreview" || !job.postId) return;
  const posts = await postsCollection();

  if (status === "completed" && outputUrl) {
    const response = await fetch(outputUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`無法下載海報預覽（${response.status}）`);
    const stored = await persistBuffer(
      Buffer.from(await response.arrayBuffer()),
      `explainer/posts/${job.postId.toHexString()}-preview.png`,
      "image/png",
    );
    await posts.updateOne(
      { _id: job.postId, previewJobId: job._id },
      {
        $set: { previewUrl: stored, previewStatus: "ready", updatedAt: new Date() },
        $unset: { previewSpendKey: "" },
      },
    );
    return;
  }

  if (!shouldRefundPreview(status)) return;
  const claimed = await posts.findOneAndUpdate(
    { _id: job.postId, previewJobId: job._id, previewSpendKey: { $type: "string" } },
    { $set: { previewStatus: "failed", updatedAt: new Date() }, $unset: { previewSpendKey: "" } },
    { returnDocument: "before" },
  );
  if (claimed?.previewSpendKey) {
    await refundCredits(claimed.clerkUserId, FRAME_COST, claimed.previewSpendKey);
    return;
  }
  await posts.updateOne(
    { _id: job.postId, previewJobId: job._id, previewStatus: "generating" },
    { $set: { previewStatus: "failed", updatedAt: new Date() } },
  );
}
