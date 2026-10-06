import type { GenerationStatus } from "@/model/generation-job";

// A failed or blocked preview returns the 4 credits for that attempt.
export function shouldRefundPreview(status: GenerationStatus) {
  return status === "failed" || status === "nsfw";
}
