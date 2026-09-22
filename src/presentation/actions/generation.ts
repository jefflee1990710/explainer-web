"use server";

import * as service from "@/service/generation/actions";

export async function approveStoryboardAction(
  ...args: Parameters<typeof service.approveStoryboardAction>
) {
  return service.approveStoryboardAction(...args);
}

export async function regenerateFrameAction(
  ...args: Parameters<typeof service.regenerateFrameAction>
) {
  return service.regenerateFrameAction(...args);
}

export async function updateClipStoryboardAction(
  ...args: Parameters<typeof service.updateClipStoryboardAction>
) {
  return service.updateClipStoryboardAction(...args);
}

export async function refreshGenerationAction(
  ...args: Parameters<typeof service.refreshGenerationAction>
) {
  return service.refreshGenerationAction(...args);
}
