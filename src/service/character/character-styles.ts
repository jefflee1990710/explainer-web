import type { Character, CharacterVersion } from "@/model/character";
import { characterReferenceUrls } from "@/service/character/reference-urls";

// Versions created before multi-style rows omit styleId and belong to the character's original style.
export function versionStyleId(
  character: { styleId: string },
  version: { styleId?: string },
) {
  return version.styleId || character.styleId;
}

// Original style first, then each later style in the order its first version was added.
export function characterStyleIds(character: {
  styleId: string;
  versions: Array<{ styleId?: string }>;
}): string[] {
  const ids: string[] = [];
  function push(id: string) {
    if (id && !ids.includes(id)) ids.push(id);
  }
  push(character.styleId);
  for (const version of character.versions) push(versionStyleId(character, version));
  return ids;
}

// Root upload: the first version that is not an edit. New styles reuse these photos, not a later sheet.
export function originalCharacterSource(
  versions: Array<{
    parentVersionId?: unknown;
    prompt: string;
    referenceImageUrl?: string;
    referenceImageUrls?: string[];
  }>,
) {
  const root = versions.find((version) => !version.parentVersionId) ?? versions[0];
  if (!root) return { prompt: "", referenceImageUrls: [] as string[] };
  return {
    prompt: root.prompt,
    referenceImageUrls: characterReferenceUrls(root),
  };
}

// Completed sheet for one style. The character default wins when it belongs to that style.
export function resolveVersionForStyle(
  character: Pick<Character, "styleId" | "defaultVersionId" | "versions">,
  styleId: string,
): CharacterVersion | null {
  const matches = character.versions.filter(
    (version) =>
      versionStyleId(character, version) === styleId &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl),
  );
  if (character.defaultVersionId) {
    const explicit = matches.find((version) => version.id.equals(character.defaultVersionId!));
    if (explicit) return explicit;
  }
  return (
    matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}
