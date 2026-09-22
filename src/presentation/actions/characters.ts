"use server";

import * as service from "@/service/character/actions";

export type { CharacterResult, DeleteCharacterResult } from "@/service/character/actions";

export async function createCharacterAction(
  ...args: Parameters<typeof service.createCharacterAction>
) {
  return service.createCharacterAction(...args);
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
