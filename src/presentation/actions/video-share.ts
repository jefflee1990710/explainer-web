"use server";

import * as service from "@/service/video-share/draft-caption";

export async function draftShareCaptionAction(
  ...args: Parameters<typeof service.draftShareCaptionAction>
) {
  return service.draftShareCaptionAction(...args);
}
