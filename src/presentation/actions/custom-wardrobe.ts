"use server";

import { logServerUxEvent } from "@/service/analytics/ux-tracker";
import * as service from "@/service/character/custom-wardrobe";

export type {
  AnalyzeCustomWardrobeResult,
  CreateCustomWardrobeResult,
} from "@/service/character/custom-wardrobe";

export async function analyzeCustomWardrobeImageAction(
  ...args: Parameters<typeof service.analyzeCustomWardrobeImageAction>
) {
  const res = await service.analyzeCustomWardrobeImageAction(...args);
  logServerUxEvent(res.ok ? "wardrobe_image_analyzed" : "ux_blocker_wardrobe_analyze_failed", {
    error: res.ok ? undefined : res.error,
  });
  return res;
}

export async function createCustomWardrobeItemAction(
  ...args: Parameters<typeof service.createCustomWardrobeItemAction>
) {
  const res = await service.createCustomWardrobeItemAction(...args);
  logServerUxEvent(res.ok ? "wardrobe_item_created" : "ux_blocker_wardrobe_create_failed", {
    category: args[0]?.category,
    error: res.ok ? undefined : res.error,
  });
  return res;
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
