"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/jutsu/pipeline";
import { ensureJutsuJobOpenCutVideo } from "@/service/opencut/standalone-engine-video";

export async function startScroSwapJobAction(
  ...args: Parameters<typeof service.startScroSwapJob>
) {
  const res = await service.startScroSwapJob(...args);
  logServerUxEvent(
    res.ok ? "scro_swap_job_started" : "ux_blocker_scro_swap_start_failed",
    res.ok
      ? { jobId: res.job.id, status: res.job.status }
      : { error: res.error },
  );
  return res;
}

export async function prepareJutsuJobAction(
  ...args: Parameters<typeof service.prepareJutsuJob>
) {
  const res = await service.prepareJutsuJob(...args);
  logServerUxEvent(
    res.ok ? "jutsu_job_prepared" : "ux_blocker_jutsu_prepare_failed",
    res.ok
      ? { mode: args[0]?.mode, jobId: res.job.id }
      : { mode: args[0]?.mode, error: res.error },
  );
  return res;
}

export async function renderJutsuVideoAction(
  ...args: Parameters<typeof service.renderJutsuVideo>
) {
  const res = await service.renderJutsuVideo(...args);
  logServerUxEvent(
    res.ok ? "jutsu_video_render_started" : "ux_blocker_jutsu_render_failed",
    res.ok
      ? { jobId: res.job.id, status: res.job.status }
      : { error: res.error },
  );
  return res;
}

export async function pollJutsuJobStatusAction(
  ...args: Parameters<typeof service.pollJutsuJobStatus>
) {
  return service.pollJutsuJobStatus(...args);
}

export async function deleteJutsuJobAction(
  ...args: Parameters<typeof service.deleteJutsuJob>
) {
  return service.deleteJutsuJob(...args);
}

export async function detectJutsuPeopleAction(
  ...args: Parameters<typeof service.detectJutsuPeopleInFrame>
) {
  return service.detectJutsuPeopleInFrame(...args);
}

export async function openJutsuJobInEditorAction(jobId: string) {
  return ensureJutsuJobOpenCutVideo(jobId);
}
