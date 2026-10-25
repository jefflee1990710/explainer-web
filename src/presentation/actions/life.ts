"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/character/life";

export async function searchLifeScenesAction(
  ...args: Parameters<typeof service.searchLifeScenesAction>
) {
  return service.searchLifeScenesAction(...args);
}

export async function generateLifeShotAction(
  ...args: Parameters<typeof service.generateLifeShotAction>
) {
  const res = await service.generateLifeShotAction(...args);
  if (res.ok) {
    logServerUxEvent("life_shot_submitted", {
      characterId: args[0]?.characterId,
      createMode: args[0]?.createMode,
      kind: args[0]?.kind,
    });
  } else {
    logServerUxEvent("ux_blocker_life_shot_failed", {
      characterId: args[0]?.characterId,
      error: res.error,
      neededCredits: "neededCredits" in res ? res.neededCredits : undefined,
    });
  }
  return res;
}

export async function listLifeShotsAction() {
  return service.listLifeShotsAction();
}

export async function saveEditedLifeShotAction(
  ...args: Parameters<typeof service.saveEditedLifeShotAction>
) {
  return service.saveEditedLifeShotAction(...args);
}

export async function generateLifeCaptionAction(
  ...args: Parameters<typeof service.generateLifeCaptionAction>
) {
  return service.generateLifeCaptionAction(...args);
}
