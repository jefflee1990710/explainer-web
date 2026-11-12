"use server";

import {
  appendDirectorClipAction as appendDirectorClip,
  deleteClipAction as deleteClip,
  duplicateClipAction as duplicateClip,
  reorderClipsAction as reorderClips,
} from "@/service/clip/clip-timeline-actions";
import { appendSimpleClipAction as appendSimpleClip } from "@/service/clip/append-simple-clip";

export async function appendSimpleClipAction(
  ...args: Parameters<typeof appendSimpleClip>
) {
  return appendSimpleClip(...args);
}


export async function appendDirectorClipAction(
  ...args: Parameters<typeof appendDirectorClip>
) {
  return appendDirectorClip(...args);
}

export async function duplicateClipAction(
  ...args: Parameters<typeof duplicateClip>
) {
  return duplicateClip(...args);
}

export async function reorderClipsAction(...args: Parameters<typeof reorderClips>) {
  return reorderClips(...args);
}

export async function deleteClipAction(...args: Parameters<typeof deleteClip>) {
  return deleteClip(...args);
}
