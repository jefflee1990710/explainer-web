"use server";

import * as service from "@/service/text-style/actions";

export type {
  TextStyleResult,
  CreateTextStyleResult,
  SaveTextStyleResult,
  TextStyleChatResult,
  GenerateTextStylePreviewResult,
} from "@/service/text-style/actions";

export async function createTextStyleAction(
  ...args: Parameters<typeof service.createTextStyleAction>
) {
  return service.createTextStyleAction(...args);
}

export async function createTextStyleFromLookAction(
  ...args: Parameters<typeof service.createTextStyleFromLookAction>
) {
  return service.createTextStyleFromLookAction(...args);
}

export async function saveTextStyleAction(
  ...args: Parameters<typeof service.saveTextStyleAction>
) {
  return service.saveTextStyleAction(...args);
}

export async function sendTextStyleChatAction(
  ...args: Parameters<typeof service.sendTextStyleChatAction>
) {
  return service.sendTextStyleChatAction(...args);
}

export async function generateTextStylePreviewAction(
  ...args: Parameters<typeof service.generateTextStylePreviewAction>
) {
  return service.generateTextStylePreviewAction(...args);
}

export async function replaceTextStyleImageAction(
  ...args: Parameters<typeof service.replaceTextStyleImageAction>
) {
  return service.replaceTextStyleImageAction(...args);
}

export async function deleteTextStyleAction(
  ...args: Parameters<typeof service.deleteTextStyleAction>
) {
  return service.deleteTextStyleAction(...args);
}
