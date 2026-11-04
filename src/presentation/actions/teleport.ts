"use server";

import { ensureTeleportJobOpenCutVideo } from "@/service/opencut/standalone-engine-video";
import {
  deleteTeleportJob,
  pollTeleportJobStatus,
  startTeleportJob,
} from "@/service/teleport/pipeline";

export async function startTeleportJobAction(
  ...args: Parameters<typeof startTeleportJob>
) {
  return startTeleportJob(...args);
}

export async function pollTeleportJobStatusAction(
  ...args: Parameters<typeof pollTeleportJobStatus>
) {
  return pollTeleportJobStatus(...args);
}

export async function deleteTeleportJobAction(
  ...args: Parameters<typeof deleteTeleportJob>
) {
  return deleteTeleportJob(...args);
}

export async function openTeleportJobInEditorAction(jobId: string) {
  return ensureTeleportJobOpenCutVideo(jobId);
}
