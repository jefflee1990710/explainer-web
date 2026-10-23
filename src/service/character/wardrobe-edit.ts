import type { CharacterSpec } from "@/model/character-spec";
import { detectCharacterWardrobePicks, isFullBodyTop } from "@/service/character/character-look";

export type WardrobeChanges = Partial<
  Record<"hair" | "top" | "pants" | "shoes" | "accessory", string>
>;

export type WardrobeVersionNode = {
  id: { toHexString(): string };
  parentVersionId?: { toHexString(): string };
  editInstruction?: string;
};

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

// Walk parentVersionId from the root down to `target`, merging each step's wardrobe edits in order
// so every generation can edit the root v1 board directly instead of chaining v1 -> v2 -> ... -> vN.
export function cumulativeWardrobeEdit(
  versions: readonly WardrobeVersionNode[],
  target: WardrobeVersionNode,
): string {
  const byId = new Map(versions.map((v) => [v.id.toHexString(), v]));
  const chain: WardrobeVersionNode[] = [];
  let current: WardrobeVersionNode | undefined = target;
  const seen = new Set<string>();
  while (current?.parentVersionId) {
    const id = current.id.toHexString();
    if (seen.has(id)) break;
    seen.add(id);
    chain.push(current);
    current = byId.get(current.parentVersionId.toHexString());
  }
  chain.reverse();
  if (chain.length === 0) return cleanWardrobeEditText(target.editInstruction ?? "");

  const parts: WardrobeChanges = {};
  const notes: string[] = [];
  for (const step of chain) {
    if (!step.editInstruction) continue;
    const stepClean = cleanWardrobeEditText(step.editInstruction);
    let stepSetPants = false;
    let stepSetTop = false;
    for (const raw of stepClean.split(/;\s*/)) {
      const segment = raw.trim();
      if (!segment) continue;
      const match = segment.match(/^(Hair|Top|Pants|Shoes|Accessory):\s*(.+)$/);
      if (match) {
        const part = LABEL_TO_PART[match[1]];
        parts[part] = match[2].trim();
        if (part === "pants") stepSetPants = true;
        if (part === "top") stepSetTop = true;
      } else if (!notes.includes(segment)) {
        notes.push(segment);
      }
    }
    // A one-piece full-body top (dress, robe, qipao) put on without a new pants line replaces any earlier pants.
    if (stepSetTop && !stepSetPants) {
      const topId = detectCharacterWardrobePicks(step.editInstruction).top;
      if (isFullBodyTop(topId)) delete parts.pants;
    }
  }

  const ordered: string[] = [];
  for (const [label, part] of Object.entries(LABEL_TO_PART)) {
    const value = parts[part];
    if (value) ordered.push(`${label}: ${value}`);
  }
  ordered.push(...notes);
  return ordered.join("; ");
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
