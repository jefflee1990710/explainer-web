import {
  CHARACTER_WARDROBE_PARTS,
  lookOptionCategory,
  optionsForLookPart,
  type CharacterLookCategory,
  type CharacterLookOption,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import {
  lookOptionDescription,
  lookOptionTags,
  optionMatchesLookTags,
} from "@/service/character/look-tags";

export type PublicWardrobeCatalogOption = {
  id: string;
  part: CharacterWardrobePart;
  category: Exclude<CharacterLookCategory, "all">;
  prompt: string;
  description: string;
  tags: string[];
};

function toPublicOption(
  part: CharacterWardrobePart,
  option: CharacterLookOption,
): PublicWardrobeCatalogOption {
  return {
    id: option.id,
    part,
    category: lookOptionCategory(part, option.id),
    prompt: option.prompt,
    description: lookOptionDescription(option),
    tags: lookOptionTags(part, option),
  };
}

// Built-in hair / cloth / shoe / accessory catalog for room, life, and character create.
export function listWardrobeCatalogOptions(input?: {
  part?: CharacterWardrobePart;
  category?: Exclude<CharacterLookCategory, "all">;
  tags?: readonly string[];
}): PublicWardrobeCatalogOption[] {
  const parts = input?.part ? [input.part] : [...CHARACTER_WARDROBE_PARTS];
  const requiredTags = (input?.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const rows: PublicWardrobeCatalogOption[] = [];
  for (const part of parts) {
    for (const option of optionsForLookPart(part)) {
      const category = lookOptionCategory(part, option.id);
      if (input?.category && category !== input.category) continue;
      if (!optionMatchesLookTags(part, option, requiredTags)) continue;
      rows.push(toPublicOption(part, option));
    }
  }
  return rows;
}
