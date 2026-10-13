"use server";

import * as service from "@/service/character/actions";
import type { CharacterLookSelection } from "@/service/character/character-look";
import { requireAppUser } from "@/service/auth";
import { renderCharacterPoseSheet, reviseCharacterPoseSheet } from "@/service/character/pose-sheet";

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

export async function generateCharacterPoseSheetAction(selection: CharacterLookSelection) {
  await requireAppUser();
  try {
    const image = await renderCharacterPoseSheet(selection);
    return { ok: true as const, image };
  } catch (error) {
    const message = error instanceof Error ? error.message : "產生八個姿勢失敗";
    return { ok: false as const, error: message };
  }
}

export async function reviseCharacterPoseSheetAction(input: {
  selection: CharacterLookSelection;
  image: string;
  comment: string;
}) {
  await requireAppUser();
  try {
    const image = await reviseCharacterPoseSheet(input.selection, input.image, input.comment);
    return { ok: true as const, image };
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新姿勢圖失敗";
    return { ok: false as const, error: message };
  }
}
