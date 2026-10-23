"use server";

import * as service from "@/service/character/custom-wardrobe";

export type {
  AnalyzeCustomWardrobeResult,
  CreateCustomWardrobeResult,
} from "@/service/character/custom-wardrobe";

export async function analyzeCustomWardrobeImageAction(
  ...args: Parameters<typeof service.analyzeCustomWardrobeImageAction>
) {
  return service.analyzeCustomWardrobeImageAction(...args);
}

export async function createCustomWardrobeItemAction(
  ...args: Parameters<typeof service.createCustomWardrobeItemAction>
) {
  return service.createCustomWardrobeItemAction(...args);
}

export async function listCustomWardrobeItemsAction(
  ...args: Parameters<typeof service.listCustomWardrobeItemsAction>
) {
  return service.listCustomWardrobeItemsAction(...args);
}

export async function deleteCustomWardrobeItemAction(
  ...args: Parameters<typeof service.deleteCustomWardrobeItemAction>
) {
  return service.deleteCustomWardrobeItemAction(...args);
}
