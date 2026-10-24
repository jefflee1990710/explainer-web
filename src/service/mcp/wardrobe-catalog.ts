import {
  CHARACTER_WARDROBE_PARTS,
  lookOptionCategory,
  optionsForLookPart,
  type CharacterLookCategory,
  type CharacterWardrobePart,
} from "@/service/character/character-look";

export type PublicWardrobeCatalogOption = {
  id: string;
  part: CharacterWardrobePart;
  category: Exclude<CharacterLookCategory, "all">;
  prompt: string;
};

// Built-in hair / cloth / shoe / accessory catalog for room, life, and character create.
export function listWardrobeCatalogOptions(input?: {
  part?: CharacterWardrobePart;
  category?: Exclude<CharacterLookCategory, "all">;
}): PublicWardrobeCatalogOption[] {
  const parts = input?.part ? [input.part] : [...CHARACTER_WARDROBE_PARTS];
  const rows: PublicWardrobeCatalogOption[] = [];
  for (const part of parts) {
    for (const option of optionsForLookPart(part)) {
      const category = lookOptionCategory(part, option.id);
      if (input?.category && category !== input.category) continue;
      rows.push({ id: option.id, part, category, prompt: option.prompt });
    }
  }
  return rows;
}
