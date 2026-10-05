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

type StyleDefaultCharacter = Pick<
  Character,
  "styleId" | "defaultVersionId" | "styleDefaults" | "versions"
>;

// True when this style already has a chosen sheet, including the legacy single default.
export function styleHasDefault(character: StyleDefaultCharacter, styleId: string) {
  if (character.styleDefaults?.[styleId]) return true;
  if (!character.defaultVersionId) return false;
  return character.versions.some(
    (version) =>
      version.id.equals(character.defaultVersionId!) &&
      versionStyleId(character, version) === styleId,
  );
}

// Completed sheet for one style. That style's own default wins; otherwise the newest sheet.
export function resolveVersionForStyle(
  character: StyleDefaultCharacter,
  styleId: string,
): CharacterVersion | null {
  const matches = character.versions.filter(
    (version) =>
      versionStyleId(character, version) === styleId &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl),
  );
  const explicitId = character.styleDefaults?.[styleId];
  const explicit = explicitId
    ? matches.find((version) => version.id.equals(explicitId))
    : undefined;
  if (explicit) return explicit;
  if (character.defaultVersionId) {
    const legacy = matches.find((version) => version.id.equals(character.defaultVersionId!));
    if (legacy) return legacy;
  }
  return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}
