import { ObjectId } from "mongodb";
import type { CharacterVersion } from "@/model/character";
import { resolveDefaultVersion } from "@/service/character/versions";

// Face lock for one blueprint version: portrait, then standing figure, then the board.
export function lifeVersionFaceUrl(version: CharacterVersion | null) {
  if (!version || version.status !== "completed") return null;
  return version.portraitUrl || version.profileUrl || version.blueprintUrl || null;
}

// The life post uses this look. An explicit version must belong to the character and be completed.
// Omitting versionId keeps the newest completed blueprint.
export function resolveLifeShotVersion(
  character: { versions: CharacterVersion[] },
  versionId?: string,
): { ok: true; version: CharacterVersion } | { ok: false; error: string } {
  if (versionId) {
    if (!ObjectId.isValid(versionId)) return { ok: false, error: "版本不存在" };
    const target = character.versions.find((version) => version.id.equals(new ObjectId(versionId)));
    if (!target || target.status !== "completed") return { ok: false, error: "版本不存在" };
    return { ok: true, version: target };
  }
  const version = resolveDefaultVersion(character);
  if (!version) return { ok: false, error: "還沒有完成的藍圖" };
  return { ok: true, version };
}
