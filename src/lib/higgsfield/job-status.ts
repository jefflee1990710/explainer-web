import type { GenerationStatus } from "@/types/generation-job";
import { mediaSrc } from "@/lib/media-src";

// Webhooks often flip to completed before the file is attached. Treat that as
// still in flight so the poller keeps asking until a URL exists.
export function settleProviderStatus(
  status: GenerationStatus,
  outputUrl?: string,
): GenerationStatus {
  if ((status === "completed" || status === "nsfw") && !outputUrl) {
    return "in_progress";
  }
  return status;
}

// Poll queued/in-progress jobs, and completed ones that never stored a file.
export function jobNeedsRefresh(job: {
  status: string;
  statusUrl?: string;
  outputUrl?: string;
  blobUrl?: string;
}) {
  if (!job.statusUrl) return false;
  if (job.status === "queued" || job.status === "in_progress") return true;
  return (
    (job.status === "completed" || job.status === "nsfw") && !mediaSrc(job)
  );
}
