"use server";

import {
  applyClipExtend,
  applyClipScroSwap,
  applyClipTeleport,
} from "@/service/opencut/clip-jutsu";

export async function applyClipScroSwapAction(
  ...args: Parameters<typeof applyClipScroSwap>
) {
  return applyClipScroSwap(...args);
}

export async function applyClipTeleportAction(
  ...args: Parameters<typeof applyClipTeleport>
) {
  return applyClipTeleport(...args);
}

export async function applyClipExtendAction(
  ...args: Parameters<typeof applyClipExtend>
) {
  return applyClipExtend(...args);
}
