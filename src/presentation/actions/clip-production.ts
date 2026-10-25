"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/clip/production";

export async function generateClipFramesAction(
  ...args: Parameters<typeof service.generateClipFramesAction>
) {
  const res = await service.generateClipFramesAction(...args);
  logServerUxEvent(res.ok ? "video_keyframes_submitted" : "ux_blocker_keyframes_failed", {
    videoId: args[0],
    clipNumber: args[1],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}

export async function cancelPendingClipVideoAction(
  ...args: Parameters<typeof service.cancelPendingClipVideoAction>
) {
  return service.cancelPendingClipVideoAction(...args);
}

export async function generateClipVideoAction(
  ...args: Parameters<typeof service.generateClipVideoAction>
) {
  const res = await service.generateClipVideoAction(...args);
  logServerUxEvent(res.ok ? "video_clip_submitted" : "ux_blocker_clip_video_failed", {
    videoId: args[0],
    clipNumber: args[1],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}

export async function generateRemainingAction(
  ...args: Parameters<typeof service.generateRemainingAction>
) {
  const res = await service.generateRemainingAction(...args);
  logServerUxEvent(res.ok ? "video_generate_remaining_submitted" : "ux_blocker_generate_remaining_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}

export async function generateAllSceneImagesAction(
  ...args: Parameters<typeof service.generateAllSceneImagesAction>
) {
  const res = await service.generateAllSceneImagesAction(...args);
  logServerUxEvent(res.ok ? "video_all_keyframes_submitted" : "ux_blocker_all_keyframes_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}

export async function generateSelectedClipsAction(
  ...args: Parameters<typeof service.generateSelectedClipsAction>
) {
  const res = await service.generateSelectedClipsAction(...args);
  logServerUxEvent(res.ok ? "video_selected_clips_submitted" : "ux_blocker_selected_clips_failed", {
    videoId: args[0],
    clipNumbers: args[1],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}

export async function generateAllClipsAction(
  ...args: Parameters<typeof service.generateAllClipsAction>
) {
  const res = await service.generateAllClipsAction(...args);
  logServerUxEvent(res.ok ? "video_all_clips_submitted" : "ux_blocker_all_clips_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
    neededCredits: !res.ok && "neededCredits" in res ? res.neededCredits : undefined,
  });
  return res;
}
