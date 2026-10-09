import { createHash } from "node:crypto";
import sharp from "sharp";
import type { CastMember } from "@/model/character";
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

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載角色圖（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

// One board or one standing figure. A multi-pose sheet makes the scene draw that person again.
async function resolveLockUrl(member: CastMember) {
  if (member.blueprintKind === "board") return member.blueprintUrl;
  const characters = await charactersCollection();
  const character = await characters.findOne({ _id: member.characterId });
  const version = character?.versions.find((item) => item.id.equals(member.versionId));
  if (version?.blueprintKind === "board") return member.blueprintUrl;
  if (version?.profileUrl) return version.profileUrl;

  const blueprint = await download(member.blueprintUrl);
  const meta = await sharp(blueprint).metadata();
  const plan = sceneLockPlan({
    blueprintWidth: meta.width ?? 0,
    blueprintHeight: meta.height ?? 0,
  });
  if (plan.kind !== "front") return member.blueprintUrl;
  const front = await cropBlueprintFront(blueprint);
  const hash = createHash("sha256")
    .update(`scene-lock-v1:${member.blueprintUrl}`)
    .digest("hex")
    .slice(0, 20);
  return persistBuffer(front, `explainer/scene-character-lock/${hash}.png`, "image/png");
}

// Swap each blueprint sheet in the reference list for that character's single standing lock.
export async function withSceneCharacterLocks(cast: CastMember[], refs: string[]) {
  const replacements = new Map<string, string>();
  await Promise.all(
    cast.map(async (member) => {
      if (!refs.includes(member.blueprintUrl) || replacements.has(member.blueprintUrl)) return;
      const key = `${String(member.characterId)}:${String(member.versionId)}:${member.blueprintUrl}`;
      let pending = lockUrlCache.get(key);
      if (!pending) {
        pending = resolveLockUrl(member).catch((error) => {
          lockUrlCache.delete(key);
          throw error;
        });
        lockUrlCache.set(key, pending);
      }
      replacements.set(member.blueprintUrl, await pending);
    }),
  );
  return refs.map((url) => replacements.get(url) ?? url);
}
