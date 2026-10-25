"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/project/actions";
import { loadFolderVideoCardsForUser } from "@/service/project/load-folder-studio";

export type { DeleteVideoResult } from "@/service/project/actions";

export async function createFolderAction(
  ...args: Parameters<typeof service.createFolderAction>
) {
  const res = await service.createFolderAction(...args);
  if (res.ok) {
    logServerUxEvent("folder_created", { folderId: res.folder.id });
  } else {
    logServerUxEvent("ux_blocker_folder_create_failed", { error: res.error });
  }
  return res;
}

export async function ensureDefaultFolderAction(
  ...args: Parameters<typeof service.ensureDefaultFolderAction>
) {
  const res = await service.ensureDefaultFolderAction(...args);
  if (res.ok) {
    logServerUxEvent("onboarding_first_video_started", {
      folderId: res.folder.id,
    });
  }
  return res;
}

export async function renameFolderAction(
  ...args: Parameters<typeof service.renameFolderAction>
) {
  return service.renameFolderAction(...args);
}

export async function createVideoAction(
  ...args: Parameters<typeof service.createVideoAction>
) {
  const res = await service.createVideoAction(...args);
  if (res.ok) {
    logServerUxEvent("video_created", {
      videoId: res.project.id,
      skillSlug: res.project.skillSlug,
      styleId: res.project.styleId,
      aspectRatio: res.project.aspectRatio,
      language: res.project.language,
    });
  } else {
    logServerUxEvent("ux_blocker_video_create_failed", {
      error: res.error,
    });
  }
  return res;
}

export async function updateVideoBriefAction(
  ...args: Parameters<typeof service.updateVideoBriefAction>
) {
  const res = await service.updateVideoBriefAction(...args);
  if (res.ok) {
    logServerUxEvent("video_brief_updated", { videoId: args[0] });
  } else {
    logServerUxEvent("ux_blocker_video_brief_failed", {
      videoId: args[0],
      error: res.error,
    });
  }
  return res;
}

export async function updateVideoTextStyleAction(
  ...args: Parameters<typeof service.updateVideoTextStyleAction>
) {
  return service.updateVideoTextStyleAction(...args);
}

export async function restartVideoAction(
  ...args: Parameters<typeof service.restartVideoAction>
) {
  const res = await service.restartVideoAction(...args);
  logServerUxEvent(res.ok ? "video_restarted" : "ux_blocker_video_restart_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function updatePhaseAProposalAction(
  ...args: Parameters<typeof service.updatePhaseAProposalAction>
) {
  const res = await service.updatePhaseAProposalAction(...args);
  if (res.ok) {
    logServerUxEvent("video_storyboard_edited", { videoId: args[0] });
  }
  return res;
}

export async function reviseProjectAction(
  ...args: Parameters<typeof service.reviseProjectAction>
) {
  const res = await service.reviseProjectAction(...args);
  logServerUxEvent(res.ok ? "video_storyboard_revised" : "ux_blocker_storyboard_revise_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function retryProjectAction(
  ...args: Parameters<typeof service.retryProjectAction>
) {
  const res = await service.retryProjectAction(...args);
  logServerUxEvent(res.ok ? "video_storyboard_retried" : "ux_blocker_storyboard_retry_failed", {
    videoId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function deleteVideoAction(
  ...args: Parameters<typeof service.deleteVideoAction>
) {
  return service.deleteVideoAction(...args);
}

export async function loadFolderVideoCardsAction(folderId: string) {
  return loadFolderVideoCardsForUser(folderId);
}

export async function getVideoAction(
  ...args: Parameters<typeof service.getVideoAction>
) {
  return service.getVideoAction(...args);
}

export const createProjectAction = createVideoAction;

export const getProjectAction = getVideoAction;
