"use server";

import * as service from "@/service/opencut/clip-style";

export async function applyClipStyleAction(
  ...args: Parameters<typeof service.applyClipStyle>
) {
  return service.applyClipStyle(...args);
}

export async function setClipVideoQualityTierAction(
  ...args: Parameters<typeof service.setClipVideoQualityTier>
) {
  return service.setClipVideoQualityTier(...args);
}
