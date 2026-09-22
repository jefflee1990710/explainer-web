"use server";

import * as service from "@/service/character/upload";

export async function uploadCharacterImageAction(
  ...args: Parameters<typeof service.uploadCharacterImageAction>
) {
  return service.uploadCharacterImageAction(...args);
}
