import { generationJobsCollection } from "@/dao";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { claimFailure } from "@/service/generation/task-store";
import {
  RESTART_CANCELLABLE_KINDS,
  restartRefundFor,
} from "@/service/project/restart";
import type { Project } from "@/model/project";

// Cancel scene image / lock / plate jobs still in flight and refund each once.
// Winning the failure claim is the guard, so a job that just finished is never refunded.
export async function cancelRestartImageJobs(video: Project) {
  const jobs = await generationJobsCollection();
  const active = await jobs
    .find({
      projectId: video._id,
      kind: { $in: RESTART_CANCELLABLE_KINDS },
      status: { $nin: ["completed", "failed", "nsfw"] },
    })
    .toArray();
  for (const job of active) {
    const claimed = await claimFailure(job._id, "已重新開始，這張圖已取消並退回 credit");
    if (claimed) {
      await refundCredits(video.clerkUserId, restartRefundFor(video, job, FRAME_COST));
    }
  }
}
