import { createHash } from "node:crypto";
import sharp from "sharp";
import type { CastMember, CharacterVersion } from "@/model/character";
import { charactersCollection } from "@/dao";
import { cropBlueprintFront } from "@/service/higgsfield/outfit-identity";
import { persistBuffer } from "@/service/higgsfield/persist";

const lockUrlCache = new Map<string, Promise<string>>();

// A board (portrait + one standing figure) goes in whole: the close-up carries the face.
// Legacy sheets use the standing preview when it exists, else the cropped front figure.
export function sceneLockPlan(input: {
  blueprintKind?: "sheet" | "board";
  profileUrl?: string;
  blueprintWidth: number;
  blueprintHeight: number;
}) {
  if (input.blueprintKind === "board") return { kind: "board" as const };
  if (input.profileUrl) return { kind: "profile" as const, url: input.profileUrl };
  if (input.blueprintWidth > input.blueprintHeight) return { kind: "front" as const };
  return { kind: "blueprint" as const };
}

export function resolveBoardLockUrlFromVersion(
  fallbackUrl: string,
  version: CharacterVersion | undefined,
  options?: { preferPortrait?: boolean },
): string {
  if (options?.preferPortrait && version?.portraitUrl) {
    return version.portraitUrl;
  }
  if (version?.blueprintKind === "board" && version.blueprintUrl) {
    return version.blueprintUrl;
  }
  if (version?.profileUrl) {
    return version.profileUrl;
  }
  return fallbackUrl;
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載角色圖（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

// One board, portrait close-up, or standing figure. A multi-pose sheet makes the scene draw that person again.
async function resolveLockUrl(member: CastMember, options?: { preferPortrait?: boolean }) {
  const characters = await charactersCollection();
  const character = await characters.findOne({ _id: member.characterId });
  const version = character?.versions.find((item) => item.id.equals(member.versionId));
  if (options?.preferPortrait && version?.portraitUrl) {
    return version.portraitUrl;
  }
  if (version?.blueprintKind === "board" || member.blueprintKind === "board") {
    return resolveBoardLockUrlFromVersion(member.blueprintUrl, version, options);
  }
  if (version?.profileUrl) return version.profileUrl;

  const targetUrl = version?.blueprintUrl || member.blueprintUrl;
  const blueprint = await download(targetUrl);
  const meta = await sharp(blueprint).metadata();
  const plan = sceneLockPlan({
    blueprintWidth: meta.width ?? 0,
    blueprintHeight: meta.height ?? 0,
  });
  if (plan.kind !== "front") return targetUrl;
  const front = await cropBlueprintFront(blueprint);
  const hash = createHash("sha256")
    .update(`scene-lock-v1:${targetUrl}`)
    .digest("hex")
    .slice(0, 20);
  return persistBuffer(front, `explainer/scene-character-lock/${hash}.png`, "image/png");
}

// Swap each blueprint sheet in the reference list for that character's single standing lock
// (or their 1:1 close-up portrait when `preferPortrait: true` for seated talking-head).
// Scene locks anchor 100% to the character's Base Blueprint / style board without raw upload interference.
export async function withSceneCharacterLocks(
  cast: CastMember[],
  refs: string[],
  options?: { preferPortrait?: boolean; includeOriginalPhoto?: boolean },
) {
  const replacements = new Map<string, string[]>();
  const modeKey = options?.preferPortrait ? "portrait" : "default";
  await Promise.all(
    cast.map(async (member) => {
      if (!refs.includes(member.blueprintUrl) || replacements.has(member.blueprintUrl)) return;
      const key = `${modeKey}:${String(member.characterId)}:${String(member.versionId)}:${member.blueprintUrl}`;
      let pending = lockUrlCache.get(key);
      if (!pending) {
        pending = resolveLockUrl(member, options).catch((error) => {
          lockUrlCache.delete(key);
          throw error;
        });
        lockUrlCache.set(key, pending);
      }
      const lockUrl = await pending;
      replacements.set(member.blueprintUrl, [lockUrl]);
    }),
  );
  return refs.flatMap((url) => replacements.get(url) ?? [url]);
}
