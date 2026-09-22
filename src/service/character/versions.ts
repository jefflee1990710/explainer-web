import type { ObjectId } from "mongodb";
import type { Character, CharacterVersion } from "@/model/character";

export function canSetDefault(version: CharacterVersion) {
  return version.status === "completed";
}

// Explicit default if it is completed; otherwise the newest completed version.
export function resolveDefaultVersion(
  character: Pick<Character, "defaultVersionId" | "versions">,
): CharacterVersion | null {
  if (character.defaultVersionId) {
    const explicit = character.versions.find(
      (version) =>
        version.id.equals(character.defaultVersionId!) && version.status === "completed",
    );
    if (explicit) return explicit;
  }
  const completed = character.versions
    .filter((version) => version.status === "completed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return completed[0] || null;
}

// 1-based position in the append-only versions array; 0 when missing.
export function versionNumber(
  character: Pick<Character, "versions">,
  versionId: ObjectId,
) {
  const index = character.versions.findIndex((version) => version.id.equals(versionId));
  return index === -1 ? 0 : index + 1;
}
