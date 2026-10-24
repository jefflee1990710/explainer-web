import {
  characterLookOption,
  isCharacterLookId,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";
import {
  toPublicWardrobeCombination,
  type IgPostSetting,
  type IgPostShotType,
  type PublicWardrobeCombination,
  type WardrobeCombination,
} from "@/model/wardrobe-combination";
import { WARDROBE_COMBINATIONS } from "@/model/wardrobe-combinations.data";

export interface WardrobeCombinationFilter {
  /** Free-text search across title, description, IG account, and raw garments. */
  query?: string;
  /** Filter by aesthetic, sport, or regional tag (e.g. "casual", "pickleball", "korea"). */
  tag?: string;
  /** Filter by multiple tags (matches if combination has at least one). */
  tags?: readonly string[];
  /** Filter by source Instagram creator/brand handle (e.g. "yeyedamei", "_tnnn26"). */
  account?: string;
  /** Filter by scene setting (e.g. "cafe_restaurant", "street_urban", "gym_sport"). */
  setting?: IgPostSetting;
  /** Filter by shot type (e.g. "ootd_full_body", "posed_portrait", "mirror_selfie"). */
  shotType?: IgPostShotType;
  /** Filter combinations that include a specific catalog item ID (cloth, shoe, accessory, or hair). */
  itemId?: string;
  /** Maximum number of results to return. */
  limit?: number;
}

const BY_ID = new Map<string, WardrobeCombination>(
  WARDROBE_COMBINATIONS.map((combo) => [combo.id, combo]),
);

// Lookup a single recommended wardrobe combination by its ID.
export function getWardrobeCombinationById(
  id: string | undefined | null,
): PublicWardrobeCombination | null {
  if (!id) return null;
  const found = BY_ID.get(id.trim());
  return found ? toPublicWardrobeCombination(found) : null;
}

// List and filter recommended wardrobe combinations distilled from downloaded IG post images.
export function listWardrobeCombinations(
  filter: WardrobeCombinationFilter = {},
): PublicWardrobeCombination[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  const singleTag = filter.tag?.trim().toLowerCase() ?? "";
  const multiTags = (filter.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  const account = filter.account?.trim().toLowerCase().replace(/^@/, "") ?? "";
  const itemId = filter.itemId?.trim() ?? "";

  const results: PublicWardrobeCombination[] = [];

  for (const combo of WARDROBE_COMBINATIONS) {
    if (singleTag && !combo.tags.some((t) => t.toLowerCase() === singleTag)) {
      continue;
    }
    if (
      multiTags.length > 0 &&
      !multiTags.some((tag) => combo.tags.some((t) => t.toLowerCase() === tag))
    ) {
      continue;
    }
    if (account && combo.sourcePost.account.toLowerCase() !== account) {
      continue;
    }
    if (filter.setting && combo.sourcePost.setting !== filter.setting) {
      continue;
    }
    if (filter.shotType && combo.sourcePost.shotType !== filter.shotType) {
      continue;
    }
    if (itemId) {
      const { top, pants, shoes, accessory, hair } = combo.items;
      if (
        top !== itemId &&
        pants !== itemId &&
        shoes !== itemId &&
        accessory !== itemId &&
        hair !== itemId
      ) {
        continue;
      }
    }
    if (query) {
      const hay = [
        combo.id,
        combo.nameEn,
        combo.nameZh,
        combo.description,
        combo.sourcePost.account,
        combo.sourcePost.setting,
        combo.tags.join(" "),
        combo.extractedRaw?.top ?? "",
        combo.extractedRaw?.pants ?? "",
        combo.extractedRaw?.shoes ?? "",
        combo.extractedRaw?.accessory ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) {
        continue;
      }
    }
    results.push(toPublicWardrobeCombination(combo));
    if (filter.limit && filter.limit > 0 && results.length >= filter.limit) {
      break;
    }
  }

  return results;
}

// Recommend outfit combinations that best complement the user's currently selected cloth/shoe/accessory picks.
export function recommendCombinationsForWardrobePicks(
  picks: CharacterWardrobePicks,
  limit = 6,
): PublicWardrobeCombination[] {
  const pickedTags = new Set<string>();
  for (const [part, id] of Object.entries(picks) as Array<[keyof CharacterWardrobePicks, string | undefined]>) {
    if (!id) continue;
    const opt = characterLookOption(part, id);
    if (opt?.tags) {
      for (const t of opt.tags) pickedTags.add(t);
    }
  }

  const scored = WARDROBE_COMBINATIONS.map((combo, index) => {
    let score = 0;
    if (picks.top && combo.items.top === picks.top) score += 5;
    if (picks.pants && combo.items.pants === picks.pants) score += 5;
    if (picks.shoes && combo.items.shoes === picks.shoes) score += 4;
    if (picks.accessory && combo.items.accessory === picks.accessory) score += 3;
    if (picks.hair && combo.items.hair === picks.hair) score += 2;
    for (const t of combo.tags) {
      if (pickedTags.has(t)) score += 1;
    }
    return { combo, score, index };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored
    .slice(0, Math.max(1, limit))
    .map((entry) => toPublicWardrobeCombination(entry.combo));
}

// Convert a recommended combination's items into CharacterWardrobePicks ready to apply to a character or Life shot.
export function wardrobeCombinationToPicks(
  combo: Pick<WardrobeCombination, "items">,
): CharacterWardrobePicks {
  const picks: CharacterWardrobePicks = {
    top: combo.items.top,
    pants: combo.items.pants,
    shoes: combo.items.shoes,
    accessory: combo.items.accessory,
  };
  if (combo.items.hair && isCharacterLookId("hair", combo.items.hair)) {
    picks.hair = combo.items.hair;
  }
  return picks;
}
