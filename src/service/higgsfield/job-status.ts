import type { Filter } from "mongodb";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import { mediaSrc } from "@/util/media-src";

// Webhooks often flip to completed before the file is attached. Treat that as
// still in flight so the poller keeps asking until a URL exists.
// NSFW is a terminal safety rejection — never rewrite it to in_progress.
export function settleProviderStatus(
  status: GenerationStatus,
  outputUrl?: string,
): GenerationStatus {
  if (status === "completed" && !outputUrl) {
    return "in_progress";
  }
  return status;
}

// Poll queued/in-progress jobs, and completed ones that never stored a file.
// NSFW is terminal (failed for the UI); do not keep refreshing it.
export function jobNeedsRefresh(job: {
  status: string;
  statusUrl?: string;
  outputUrl?: string;
  blobUrl?: string;
}) {
  if (!job.statusUrl) return false;
  if (job.status === "queued" || job.status === "in_progress") return true;
  return job.status === "completed" && !mediaSrc(job);
}

// Mongo form of `jobNeedsRefresh`, so a limited query only returns jobs that
// still need polling. `$in: [null, ""]` matches missing, null, and empty.
// The driver's types reject `null` in `$in` for optional fields, hence the cast.
export function jobNeedsRefreshFilter(): Filter<GenerationJob> {
  const noValue = { $in: [null, ""] };
  return {
    statusUrl: { $nin: [null, ""] },
    $or: [
      { status: { $in: ["queued", "in_progress"] } },
      { status: "completed", blobUrl: noValue, outputUrl: noValue },
    ],
  } as Filter<GenerationJob>;
}

// User-facing copy for provider failure codes.
export function userFacingJobError(status: string, error?: string) {
  const detail = (error || status || "").toLowerCase();
  if (status === "nsfw" || detail === "nsfw" || detail.includes("nsfw")) {
    return "內容未通過安全檢查，請調整後重試";
  }
  if (
    detail.includes("took too long") ||
    detail.includes("timed out") ||
    detail.includes("timeout")
  ) {
    return "產生逾時，請再試一次";
  }
  // Higgsfield Flare rejects the whole prompt and echoes it back; keep the tile short.
  if (detail.includes("is too long")) {
    return "產圖說明過長，請再試一次";
  }
  return error || status || "產生失敗";
}
