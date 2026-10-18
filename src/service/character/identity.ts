import type { Character } from "@/model/character";
import { resolveDefaultVersion } from "@/service/character/versions";

// Face lock for a life photo: portrait, then standing figure, then the board.
export function characterIdentityUrl(character: Pick<Character, "defaultVersionId" | "versions">) {
  const version = resolveDefaultVersion(character);
  if (!version || version.status !== "completed") return null;
  return version.portraitUrl || version.profileUrl || version.blueprintUrl || null;
}
