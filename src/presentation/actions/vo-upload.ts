"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/project/vo-upload";

export type {
  UpdateClipVoResult,
  UploadTalkingHeadVoResult,
} from "@/service/project/vo-upload";

export async function uploadTalkingHeadVoAction(
  ...args: Parameters<typeof service.uploadTalkingHeadVoAction>
) {
  const res = await service.uploadTalkingHeadVoAction(...args);
  logServerUxEvent(
    res.ok ? "talking_head_vo_uploaded" : "ux_blocker_talking_head_vo_upload_failed",
    res.ok
      ? { durationSeconds: res.durationSeconds }
      : { error: res.error },
  );
  return res;
}

export async function updateClipUploadedVoAction(
  ...args: Parameters<typeof service.updateClipUploadedVoAction>
) {
  const res = await service.updateClipUploadedVoAction(...args);
  logServerUxEvent(
    res.ok ? "clip_vo_rerecorded" : "ux_blocker_clip_vo_rerecord_failed",
    res.ok
      ? {
          videoId: args[0]?.videoId,
          clipNumber: args[0]?.clipNumber,
          regenerateVideo: Boolean(args[0]?.regenerateVideo),
        }
      : { error: res.error },
  );
  return res;
}
