"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/reel/actions";

export async function composeReelAction(
  ...args: Parameters<typeof service.composeReelAction>
) {
  const res = await service.composeReelAction(...args);
  logServerUxEvent(res.ok ? "video_reel_assembled" : "ux_blocker_reel_assemble_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}
