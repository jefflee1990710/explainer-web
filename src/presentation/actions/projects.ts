"use server";

import * as service from "@/service/project/actions";

export type { DeleteVideoResult } from "@/service/project/actions";

export async function createFolderAction(
  ...args: Parameters<typeof service.createFolderAction>
) {
  return service.createFolderAction(...args);
}

export async function renameFolderAction(
  ...args: Parameters<typeof service.renameFolderAction>
) {
  return service.renameFolderAction(...args);
}

export async function createVideoAction(
  ...args: Parameters<typeof service.createVideoAction>
) {
  return service.createVideoAction(...args);
}

export async function updateVideoBriefAction(
  ...args: Parameters<typeof service.updateVideoBriefAction>
) {
  return service.updateVideoBriefAction(...args);
}

export async function updatePhaseAProposalAction(
  ...args: Parameters<typeof service.updatePhaseAProposalAction>
) {
  return service.updatePhaseAProposalAction(...args);
}

export async function reviseProjectAction(
  ...args: Parameters<typeof service.reviseProjectAction>
) {
  return service.reviseProjectAction(...args);
}

export async function retryProjectAction(
  ...args: Parameters<typeof service.retryProjectAction>
) {
  return service.retryProjectAction(...args);
}

export async function deleteVideoAction(
  ...args: Parameters<typeof service.deleteVideoAction>
) {
  return service.deleteVideoAction(...args);
}

export async function getVideoAction(
  ...args: Parameters<typeof service.getVideoAction>
) {
  return service.getVideoAction(...args);
}

export const createProjectAction = createVideoAction;

export const getProjectAction = getVideoAction;
