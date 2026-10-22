import type { CharacterSpec } from "@/model/character-spec";

export type WardrobeChanges = Partial<
  Record<"hair" | "top" | "pants" | "shoes" | "accessory", string>
>;

const LABEL_TO_PART: Record<string, keyof WardrobeChanges> = {
  Hair: "hair",
  Top: "top",
  Pants: "pants",
  Shoes: "shoes",
  Accessory: "accessory",
};

// Catalog prompts end with a preview-generation tag the image model must not see.
export function cleanWardrobeEditText(text: string) {
  return text.replace(/\s*Isolated wardrobe piece [\w-]+\.?/g, "").trim();
}

// Read "Hair: …; Top: …" segments composed by characterWardrobeEditInstruction.
export function parseWardrobeChanges(instruction: string): WardrobeChanges {
  const changes: WardrobeChanges = {};
  for (const segment of cleanWardrobeEditText(instruction).split(/;\s*/)) {
    const match = segment.match(/^(Hair|Top|Pants|Shoes|Accessory):\s*(.+)$/);
    if (match) changes[LABEL_TO_PART[match[1]]] = match[2].trim();
  }
  return changes;
}

// Portrait is a head-and-shoulders crop, so lower-body parts (Pants / Shoes) are out of frame.
// Dropping them stops the image model from zooming out to a full-body shot just to show a skirt or shoes.
export function portraitWardrobeEditText(instruction: string): string {
  const segments = cleanWardrobeEditText(instruction)
    .split(/;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const kept = segments.filter((segment) => !/^(Pants|Shoes):\s*/.test(segment));
  return kept.join("; ");
}

// The new version's spec: picked hair / clothes replace the stale lines read from the root photos.
export function specAfterWardrobeEdit(
  spec: CharacterSpec | undefined,
  instruction: string,
): CharacterSpec | undefined {
  if (!spec) return spec;
  const changes = parseWardrobeChanges(instruction);
  const clothes = (["top", "pants", "shoes", "accessory"] as const)
    .map((part) => changes[part])
    .filter((value): value is string => Boolean(value));
  if (!changes.hair && clothes.length === 0) return spec;
  return {
    ...spec,
    ...(changes.hair ? { hair: changes.hair } : {}),
    ...(clothes.length
      ? { outfit: clothes.map((item) => item.replace(/\.$/, "")).join(", "), palette: [] }
      : {}),
  };
}
