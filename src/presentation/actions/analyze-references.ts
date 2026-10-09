"use server";

import * as service from "@/service/character/analyze-references";

export async function analyzeCharacterReferencesAction(
  ...args: Parameters<typeof service.analyzeCharacterReferencesAction>
) {
  return service.analyzeCharacterReferencesAction(...args);
}
