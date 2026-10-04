"use server";

import * as chatImage from "@/service/director/chat-image-upload";
import * as preview from "@/service/director/director-preview";
import * as service from "@/service/director/director-actions";

export type {
  CreateDirectorResult,
  SaveDirectorResult,
  DeleteDirectorResult,
  DirectorChatResult,
} from "@/service/director/director-actions";
export type { GenerateDirectorPreviewResult } from "@/service/director/director-preview";

export async function createDirectorAction(
  ...args: Parameters<typeof service.createDirectorAction>
) {
  return service.createDirectorAction(...args);
}

export async function saveDirectorAction(
  ...args: Parameters<typeof service.saveDirectorAction>
) {
  return service.saveDirectorAction(...args);
}

export async function deleteDirectorAction(
  ...args: Parameters<typeof service.deleteDirectorAction>
) {
  return service.deleteDirectorAction(...args);
}

export async function sendDirectorChatAction(
  ...args: Parameters<typeof service.sendDirectorChatAction>
) {
  return service.sendDirectorChatAction(...args);
}

export async function generateDirectorPreviewAction(
  ...args: Parameters<typeof preview.generateDirectorPreviewAction>
) {
  return preview.generateDirectorPreviewAction(...args);
}

export async function uploadDirectorChatImageAction(
  ...args: Parameters<typeof chatImage.uploadDirectorChatImageAction>
) {
  return chatImage.uploadDirectorChatImageAction(...args);
}
