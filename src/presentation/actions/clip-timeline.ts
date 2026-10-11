"use server";

import {
  appendDirectorClipAction as appendDirectorClip,
  deleteClipAction as deleteClip,
  reorderClipsAction as reorderClips,
} from "@/service/clip/clip-timeline-actions";

export async function appendDirectorClipAction(
  ...args: Parameters<typeof appendDirectorClip>
) {
  return appendDirectorClip(...args);
}

export async function reorderClipsAction(...args: Parameters<typeof reorderClips>) {
  return reorderClips(...args);
}

export async function deleteClipAction(...args: Parameters<typeof deleteClip>) {
  return deleteClip(...args);
}
