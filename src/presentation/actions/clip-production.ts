"use server";

import * as service from "@/service/clip/production";

export async function generateClipFramesAction(
  ...args: Parameters<typeof service.generateClipFramesAction>
) {
  return service.generateClipFramesAction(...args);
}

export async function generateClipVideoAction(
  ...args: Parameters<typeof service.generateClipVideoAction>
) {
  return service.generateClipVideoAction(...args);
}

export async function generateRemainingAction(
  ...args: Parameters<typeof service.generateRemainingAction>
) {
  return service.generateRemainingAction(...args);
}
