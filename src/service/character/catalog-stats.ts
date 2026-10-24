// Public counts for marketing the built-in look / Life databases.
import { LIFE_POSES } from "@/model/life-pose";
import { LIFE_POST_TEMPLATES } from "@/model/life-post-template";
import {
  CHARACTER_WARDROBE_PARTS,
  optionsForLookPart,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import { lookOptionTags } from "@/service/character/look-tags";

export type CatalogPartCount = {
  part: CharacterWardrobePart;
  count: number;
};

export type CatalogShowcaseStats = {
  wardrobeTotal: number;
  parts: CatalogPartCount[];
  poses: number;
  postTemplates: number;
  tagExamples: string[];
};

const SHOWCASE_TAGS = [
  "casual",
  "athletic",
  "yoga",
  "tennis",
  "pickleball",
  "heritage",
  "korea",
  "japan",
  "street",
] as const;

export function catalogShowcaseStats(): CatalogShowcaseStats {
  const parts = CHARACTER_WARDROBE_PARTS.map((part) => ({
    part,
    count: optionsForLookPart(part).length,
  }));
  const wardrobeTotal = parts.reduce((sum, row) => sum + row.count, 0);
  const present = new Set<string>();
  for (const part of CHARACTER_WARDROBE_PARTS) {
    for (const option of optionsForLookPart(part)) {
      for (const tag of lookOptionTags(part, option)) present.add(tag);
    }
  }
  return {
    wardrobeTotal,
    parts,
    poses: LIFE_POSES.length,
    postTemplates: LIFE_POST_TEMPLATES.length,
    tagExamples: SHOWCASE_TAGS.filter((tag) => present.has(tag)),
  };
}

/** Stable preview tiles for the landing mosaic (seeded WebPs already in public/). */
export const CATALOG_SHOWCASE_PREVIEWS = [
  { part: "hair", id: "korean" },
  { part: "hair", id: "wolf" },
  { part: "hair", id: "afro" },
  { part: "top", id: "seoulminimal" },
  { part: "top", id: "sptennisdress" },
  { part: "top", id: "spyogawraptop" },
  { part: "top", id: "neochinese" },
  { part: "top", id: "ankara" },
  { part: "pants", id: "spyogaflarepants" },
  { part: "pants", id: "sptennispleatskort" },
  { part: "shoes", id: "sptenniscourt" },
  { part: "accessory", id: "sptennisvisor" },
] as const;
