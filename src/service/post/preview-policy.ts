import type { GenerationStatus } from "@/model/generation-job";

// A failed or blocked preview returns the $0.135 USD Credit for that attempt.
export function shouldRefundPreview(status: GenerationStatus) {
  return status === "failed" || status === "nsfw";
}
