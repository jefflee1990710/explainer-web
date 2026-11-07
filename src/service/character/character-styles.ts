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

// Realistic is always the foundation style; legacy characters without realistic fall back to their original styleId.
export function foundationStyleId(character: {
  styleId: string;
  versions: Array<{ styleId?: string }>;
}): string {
  const ids = characterStyleIds(character);
  if (ids.includes("realistic")) return "realistic";
  return character.styleId || "realistic";
}

// Active realistic foundation blueprint version (prefers baseVersionId when completed, else root realistic version).
export function resolveBaseVersion(
  character: Pick<Character, "styleId" | "baseVersionId" | "versions">,
): CharacterVersion | null {
  if (character.baseVersionId) {
    const explicit = character.versions.find(
      (v) =>
        v.id.equals(character.baseVersionId!) &&
        v.status === "completed" &&
        Boolean(v.blueprintUrl || v.portraitUrl || v.profileUrl),
    );
    if (explicit) return explicit;
  }
  const fStyle = foundationStyleId(character);
  const rootMatch = character.versions.find(
    (v) =>
      !v.parentVersionId &&
      !v.isBaseCandidate &&
      versionStyleId(character, v) === fStyle &&
      v.status === "completed" &&
      Boolean(v.blueprintUrl || v.portraitUrl || v.profileUrl),
  );
  if (rootMatch) return rootMatch;
  return (
    character.versions.find(
      (v) =>
        !v.isBaseCandidate &&
        v.status === "completed" &&
        Boolean(v.blueprintUrl || v.portraitUrl || v.profileUrl),
    ) ?? null
  );
}

// Root upload or base blueprint: new styles reuse the base blueprint's portrait + fullBody once raw uploads are removed.
export function originalCharacterSource(
  versions: Array<{
    id?: { equals(other: unknown): boolean; toHexString?(): string };
    parentVersionId?: unknown;
    isBaseCandidate?: boolean;
    prompt: string;
    portraitUrl?: string;
    profileUrl?: string;
    blueprintUrl?: string;
    referenceImageUrl?: string;
    referenceImageUrls?: string[];
  }>,
  baseVersionId?: unknown,
) {
  const explicitBase =
    baseVersionId != null
      ? versions.find((v) => v.id && typeof v.id.equals === "function" && v.id.equals(baseVersionId))
      : undefined;
  const root =
    explicitBase ??
    versions.find((version) => !version.parentVersionId && !version.isBaseCandidate) ??
    versions[0];
  if (!root) return { prompt: "", referenceImageUrls: [] as string[] };
  const rawRefs = characterReferenceUrls(root);
  if (rawRefs.length > 0) {
    return {
      prompt: root.prompt,
      referenceImageUrls: rawRefs,
    };
  }
  const boardRefs = [root.portraitUrl, root.profileUrl].filter((url): url is string => Boolean(url));
  const fallbackRefs =
    boardRefs.length > 0
      ? boardRefs
      : root.blueprintUrl
        ? [root.blueprintUrl]
        : [];
  return {
    prompt: root.prompt,
    referenceImageUrls: fallbackRefs,
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

// Completed sheet for one style: always the newest completed non-candidate sheet.
export function resolveVersionForStyle(
  character: StyleDefaultCharacter,
  styleId: string,
): CharacterVersion | null {
  const matches = character.versions.filter(
    (version) =>
      !version.isBaseCandidate &&
      versionStyleId(character, version) === styleId &&
      version.status === "completed" &&
      Boolean(version.blueprintUrl),
  );
  return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}
