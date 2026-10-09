"use server";

import * as service from "@/service/character/actions";

export type { CharacterResult, DeleteCharacterResult } from "@/service/character/actions";

export async function createCharacterAction(
  ...args: Parameters<typeof service.createCharacterAction>
) {
  return service.createCharacterAction(...args);
}

export async function addCharacterStyleAction(
  ...args: Parameters<typeof service.addCharacterStyleAction>
) {
  return service.addCharacterStyleAction(...args);
}

export async function editCharacterVersionAction(
  ...args: Parameters<typeof service.editCharacterVersionAction>
) {
  return service.editCharacterVersionAction(...args);
}

export async function retryCharacterVersionAction(
  ...args: Parameters<typeof service.retryCharacterVersionAction>
) {
  return service.retryCharacterVersionAction(...args);
}

export async function setDefaultVersionAction(
  ...args: Parameters<typeof service.setDefaultVersionAction>
) {
  return service.setDefaultVersionAction(...args);
}

export async function suggestCharacterVoiceAction(
  ...args: Parameters<typeof service.suggestCharacterVoiceAction>
) {
  return service.suggestCharacterVoiceAction(...args);
}

export async function saveCharacterVoiceAction(
  ...args: Parameters<typeof service.saveCharacterVoiceAction>
) {
  return service.saveCharacterVoiceAction(...args);
}

export async function uploadCharacterVoiceSampleAction(
  ...args: Parameters<typeof service.uploadCharacterVoiceSampleAction>
) {
  return service.uploadCharacterVoiceSampleAction(...args);
}

export async function removeCharacterVoiceSampleAction(
  ...args: Parameters<typeof service.removeCharacterVoiceSampleAction>
) {
  return service.removeCharacterVoiceSampleAction(...args);
}

export async function renameCharacterAction(
  ...args: Parameters<typeof service.renameCharacterAction>
) {
  return service.renameCharacterAction(...args);
}

export async function deleteCharacterAction(
  ...args: Parameters<typeof service.deleteCharacterAction>
) {
  return service.deleteCharacterAction(...args);
}

export async function loadCharacterWorkspaceAction(
  ...args: Parameters<typeof service.loadCharacterWorkspaceAction>
) {
  return service.loadCharacterWorkspaceAction(...args);
}

export async function getCharacterAction(
  ...args: Parameters<typeof service.getCharacterAction>
) {
  return service.getCharacterAction(...args);
}

export async function refreshCharacterAction(
  ...args: Parameters<typeof service.refreshCharacterAction>
) {
  return service.refreshCharacterAction(...args);
}
