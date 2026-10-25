"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/character/actions";
import type { CharacterLookSelection } from "@/service/character/character-look";
import { requireAppUser } from "@/service/auth";
import { renderCharacterPoseSheet, reviseCharacterPoseSheet } from "@/service/character/pose-sheet";

export type { CharacterResult, DeleteCharacterResult } from "@/service/character/actions";

export async function createCharacterAction(
  ...args: Parameters<typeof service.createCharacterAction>
) {
  const res = await service.createCharacterAction(...args);
  if (res.ok) {
    logServerUxEvent("character_created", {
      characterId: res.character.id,
      styleId: res.character.styleId,
    });
  } else {
    logServerUxEvent("ux_blocker_character_create_failed", {
      error: res.error,
      neededCredits: "neededCredits" in res ? res.neededCredits : undefined,
    });
  }
  return res;
}

export async function addCharacterStyleAction(
  ...args: Parameters<typeof service.addCharacterStyleAction>
) {
  const res = await service.addCharacterStyleAction(...args);
  if (res.ok) {
    logServerUxEvent("character_style_added", {
      characterId: args[0],
      styleId: args[1],
    });
  } else {
    logServerUxEvent("ux_blocker_character_style_failed", { error: res.error });
  }
  return res;
}

export async function editCharacterVersionAction(
  ...args: Parameters<typeof service.editCharacterVersionAction>
) {
  const res = await service.editCharacterVersionAction(...args);
  if (res.ok) {
    logServerUxEvent("character_version_edited", { characterId: args[0] });
  } else {
    logServerUxEvent("ux_blocker_character_edit_failed", { error: res.error });
  }
  return res;
}

export async function retryCharacterVersionAction(
  ...args: Parameters<typeof service.retryCharacterVersionAction>
) {
  const res = await service.retryCharacterVersionAction(...args);
  logServerUxEvent(res.ok ? "character_version_retried" : "ux_blocker_character_retry_failed", {
    characterId: args[0],
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function setDefaultVersionAction(
  ...args: Parameters<typeof service.setDefaultVersionAction>
) {
  const res = await service.setDefaultVersionAction(...args);
  if (res.ok) {
    logServerUxEvent("character_default_version_set", { characterId: args[0] });
  }
  return res;
}

export async function saveCharacterPresetAction(
  ...args: Parameters<typeof service.saveCharacterPresetAction>
) {
  const res = await service.saveCharacterPresetAction(...args);
  if (res.ok) {
    logServerUxEvent("character_preset_saved", { characterId: args[0] });
  }
  return res;
}

export async function deleteCharacterPresetAction(
  ...args: Parameters<typeof service.deleteCharacterPresetAction>
) {
  return service.deleteCharacterPresetAction(...args);
}

export async function suggestCharacterVoiceAction(
  ...args: Parameters<typeof service.suggestCharacterVoiceAction>
) {
  return service.suggestCharacterVoiceAction(...args);
}

export async function saveCharacterPersonaAction(
  ...args: Parameters<typeof service.saveCharacterPersonaAction>
) {
  return service.saveCharacterPersonaAction(...args);
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

export async function deleteCharactersAction(
  ...args: Parameters<typeof service.deleteCharactersAction>
) {
  return service.deleteCharactersAction(...args);
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
