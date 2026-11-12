"use server";

import {
  applyClipExtend,
  applyClipScroSwap,
  applyClipTeleport,
} from "@/service/opencut/clip-jutsu";
import {
  applyClipScroSwapInsertAction as applyClipScroSwapInsert,
  applyClipTeleportInsertAction as applyClipTeleportInsert,
} from "@/service/opencut/clip-jutsu-insert";

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

export async function applyClipScroSwapInsertAction(
  ...args: Parameters<typeof applyClipScroSwapInsert>
) {
  return applyClipScroSwapInsert(...args);
}

export async function applyClipTeleportInsertAction(
  ...args: Parameters<typeof applyClipTeleportInsert>
) {
  return applyClipTeleportInsert(...args);
}


export async function applyClipExtendAction(
  ...args: Parameters<typeof applyClipExtend>
) {
  return applyClipExtend(...args);
}
