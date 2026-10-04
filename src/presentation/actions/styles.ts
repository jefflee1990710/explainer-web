"use server";

import * as service from "@/service/style/user-style-actions";
import * as chatImage from "@/service/style/chat-image-upload";

export type {
  CreateUserStyleResult,
  SaveUserStyleResult,
  DeleteUserStyleResult,
  UserStyleChatResult,
  GenerateUserStylePreviewResult,
} from "@/service/style/user-style-actions";

export async function createUserStyleAction(
  ...args: Parameters<typeof service.createUserStyleAction>
) {
  return service.createUserStyleAction(...args);
}

export async function saveUserStyleAction(
  ...args: Parameters<typeof service.saveUserStyleAction>
) {
  return service.saveUserStyleAction(...args);
}

export async function deleteUserStyleAction(
  ...args: Parameters<typeof service.deleteUserStyleAction>
) {
  return service.deleteUserStyleAction(...args);
}

export async function sendUserStyleChatAction(
  ...args: Parameters<typeof service.sendUserStyleChatAction>
) {
  return service.sendUserStyleChatAction(...args);
}

export async function generateUserStylePreviewAction(
  ...args: Parameters<typeof service.generateUserStylePreviewAction>
) {
  return service.generateUserStylePreviewAction(...args);
}

export async function uploadStyleChatImageAction(
  ...args: Parameters<typeof chatImage.uploadStyleChatImageAction>
) {
  return chatImage.uploadStyleChatImageAction(...args);
}
