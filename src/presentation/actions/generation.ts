"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/generation/actions";

export async function approveStoryboardAction(
  ...args: Parameters<typeof service.approveStoryboardAction>
) {
  const res = await service.approveStoryboardAction(...args);
  logServerUxEvent(res.ok ? "video_storyboard_approved" : "ux_blocker_storyboard_approve_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function regenerateFrameAction(
  ...args: Parameters<typeof service.regenerateFrameAction>
) {
  const res = await service.regenerateFrameAction(...args);
  logServerUxEvent(res.ok ? "video_frame_regenerated" : "ux_blocker_frame_regenerate_failed", {
    videoId: args[0],
    clipNumber: args[1],
    position: args[2],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function retrySubtitlePlateAction(
  ...args: Parameters<typeof service.retrySubtitlePlateAction>
) {
  return service.retrySubtitlePlateAction(...args);
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
