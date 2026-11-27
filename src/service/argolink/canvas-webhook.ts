// Settles a canvas job from an ArgoLink webhook body (the same JSON as GET /v1/videos/{request_id}).

import { canvasJobsCollection } from "@/dao";
import type { CanvasJob } from "@/model/canvas";
import { parseArgolinkVideoStatus } from "@/service/argolink/client";
import {
  resolveDeps,
  type CanvasExecutorDeps,
} from "@/service/canvas/execution/jobs/deps";
import { settleCompletedJob, settleFailedJob } from "@/service/canvas/execution/jobs/settle";

export type ArgolinkWebhookReply = {
  status: number;
  body: { received?: boolean; error?: string };
};

type ApplyOptions = {
  findJob?: (requestId: string) => Promise<CanvasJob | null>;
  deps?: Partial<CanvasExecutorDeps>;
};

async function findArgolinkJob(requestId: string): Promise<CanvasJob | null> {
  const jobs = await canvasJobsCollection();
  return jobs.findOne({ provider: "argolink", externalJobId: requestId });
}

// 200 once the job is finished or already settled. 503 asks ArgoLink to retry (job not stored yet, or the file is not ready).
export async function applyArgolinkCanvasWebhook(
  body: unknown,
  options?: ApplyOptions,
): Promise<ArgolinkWebhookReply> {
  const remote = parseArgolinkVideoStatus(body);
  if (!remote.request_id) {
    return { status: 400, body: { error: "Missing request" } };
  }
  if (remote.status !== "completed" && remote.status !== "failed" && remote.status !== "nsfw") {
    return { status: 200, body: { received: true } };
  }

  const job = await (options?.findJob ?? findArgolinkJob)(remote.request_id);
  if (!job) {
    return { status: 503, body: { error: "Job not ready" } };
  }
  if (job.status === "completed" || job.status === "failed") {
    return { status: 200, body: { received: true } };
  }

  const resolved = resolveDeps(options?.deps);
  if (remote.status === "completed") {
    const url = remote.video?.url;
    if (!url) return { status: 503, body: { error: "Video not ready" } };
    await settleCompletedJob(job, url, resolved);
    return { status: 200, body: { received: true } };
  }

  const message =
    remote.error ||
    (remote.status === "nsfw" ? "內容觸發安全審核限制，已自動退還 USD Credit" : "ArgoLink 影片生成失敗");
  await settleFailedJob(job, message, resolved);
  return { status: 200, body: { received: true } };
}
