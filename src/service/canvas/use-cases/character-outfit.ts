// Starts a new character outfit from the pieces wired into a canvas character node.

import { ObjectId } from "mongodb";
import { charactersCollection } from "@/dao";
import type { Character, CharacterVersion } from "@/model/character";
import { requireAppUser } from "@/service/auth";
import { canvasOutfitVersionFlags } from "@/service/canvas/core/character-node";
import { editCharacterVersionAction } from "@/service/character/actions";
import { BLUEPRINT_COST_USD, FRAME_COST_USD } from "@/service/credit-costs";

export type GenerateCanvasCharacterOutfitResult =
  | { ok: true; versionId: string; chargedUsd: number }
  | { ok: false; error: string };

function completedParent(character: Character): CharacterVersion | undefined {
  const versions = character.versions ?? [];
  const preferred = character.defaultVersionId
    ? versions.find(
        (version) =>
          version.id.equals(character.defaultVersionId!) &&
          version.status === "completed" &&
          Boolean(version.blueprintUrl),
      )
    : undefined;
  if (preferred) return preferred;
  for (let index = versions.length - 1; index >= 0; index -= 1) {
    const version = versions[index];
    if (version?.status === "completed" && version.blueprintUrl) return version;
  }
  return undefined;
}

// Branches a blueprint for this canvas node. The default outfit changes only when the checkbox is on.
export async function generateCanvasCharacterOutfit(input: {
  characterId: string;
  instruction: string;
  updateDefaultOutfit?: boolean;
}): Promise<GenerateCanvasCharacterOutfitResult> {
  const instruction = input.instruction.trim();
  if (!instruction) return { ok: false, error: "請先接上至少一件穿搭" };
  if (!ObjectId.isValid(input.characterId)) return { ok: false, error: "角色不存在" };

  const user = await requireAppUser();
  const characters = await charactersCollection();
  const character = (await characters.findOne({
    _id: new ObjectId(input.characterId),
    clerkUserId: user.clerkUserId,
  })) as Character | null;
  if (!character) return { ok: false, error: "角色不存在" };

  const parent = completedParent(character);
  if (!parent) return { ok: false, error: "這個角色還沒有完成的造型可以改" };

  const result = await editCharacterVersionAction(
    input.characterId,
    parent.id.toHexString(),
    instruction,
    canvasOutfitVersionFlags(input.updateDefaultOutfit === true),
  );
  if (!result.ok) return result;

  const parentId = parent.id.toHexString();
  const created = [...result.character.versions]
    .reverse()
    .find((version) => version.parentVersionId === parentId);
  if (!created) return { ok: false, error: "沒有產生新造型" };

  return {
    ok: true,
    versionId: created.id,
    chargedUsd: parent.blueprintKind === "board" ? BLUEPRINT_COST_USD : FRAME_COST_USD,
  };
}
