// Built-in wardrobe catalog for the canvas Assets → Outfit tab.
// These are the studio default pieces (not the user's saved looks).

import {
  CHARACTER_WARDROBE_PARTS,
  characterLookPreviewSrc,
  optionsForLookPart,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import { lookOptionDescription, lookOptionTags } from "@/service/character/look-tags";
import type { CanvasLibraryAsset } from "@/model/canvas-dto";

export type SystemOutfitRecord = {
  part: CharacterWardrobePart;
  optionId: string;
  prompt: string;
  description: string;
  tags: string[];
  previewUrl: string;
};

export type OutfitPartFilter = "all" | CharacterWardrobePart;

const SYSTEM_OUTFIT_CREATED_AT = "1970-01-01T00:00:00.000Z";

let cached: SystemOutfitRecord[] | null = null;

// Every default piece except "none", which has no garment and no preview.
export function listSystemDefaultOutfits(): readonly SystemOutfitRecord[] {
  if (cached) return cached;
  const rows: SystemOutfitRecord[] = [];
  for (const part of CHARACTER_WARDROBE_PARTS) {
    for (const option of optionsForLookPart(part)) {
      if (option.id === "none") continue;
      const previewUrl = characterLookPreviewSrc(part, option.id);
      if (!previewUrl) continue;
      rows.push({
        part,
        optionId: option.id,
        prompt: option.prompt,
        description: lookOptionDescription(option),
        tags: [...lookOptionTags(part, option)],
        previewUrl,
      });
    }
  }
  cached = rows;
  return rows;
}

export function systemOutfitAsset(row: SystemOutfitRecord, name: string): CanvasLibraryAsset {
  return {
    id: `system-outfit-${row.part}-${row.optionId}`,
    source: "outfit",
    name,
    mediaKind: "image",
    url: row.previewUrl,
    thumbnailUrl: row.previewUrl,
    createdAt: SYSTEM_OUTFIT_CREATED_AT,
    outfitPart: row.part,
    outfitPrompt: row.prompt,
  };
}

export function systemOutfitFallbackName(row: SystemOutfitRecord): string {
  const sentence = row.description.split(".")[0]?.trim() || row.optionId;
  return sentence.length > 48 ? `${sentence.slice(0, 45)}…` : sentence;
}

export function systemOutfitMatches(
  row: SystemOutfitRecord,
  name: string,
  query: string,
  part: OutfitPartFilter,
): boolean {
  if (part !== "all" && row.part !== part) return false;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = [name, row.optionId, row.description, row.prompt, row.tags.join(" ")]
    .join("\n")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}
