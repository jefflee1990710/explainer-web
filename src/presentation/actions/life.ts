"use server";

import * as service from "@/service/character/life";

export async function searchLifeScenesAction(
  ...args: Parameters<typeof service.searchLifeScenesAction>
) {
  return service.searchLifeScenesAction(...args);
}

export async function generateLifeShotAction(
  ...args: Parameters<typeof service.generateLifeShotAction>
) {
  return service.generateLifeShotAction(...args);
}

export async function listLifeShotsAction() {
  return service.listLifeShotsAction();
}

export async function generateLifeCaptionAction(
  ...args: Parameters<typeof service.generateLifeCaptionAction>
) {
  return service.generateLifeCaptionAction(...args);
}
