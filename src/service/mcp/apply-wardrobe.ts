import {
  CHARACTER_WARDROBE_PARTS,
  characterWardrobeEditInstruction,
  detectCharacterWardrobePicks,
  sanitizeWardrobePicks,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";
import { resolveCustomWardrobePickPrompts } from "@/service/character/custom-wardrobe";
import {
  editCharacterVersionAction,
  getCharacterAction,
} from "@/service/character/actions";
import { BLUEPRINT_COST, FRAME_COST } from "@/service/production-plan";
import { unwrap } from "@/service/mcp/wrap-tool";

// Shared fitting-room apply used by apply_character_wardrobe and extract_cloth_for_character.
export async function applyWardrobeToCharacter(input: {
  clerkUserId: string;
  characterId: string;
  versionId: string;
  wardrobe: CharacterWardrobePicks;
  note?: string;
}) {
  const picks = sanitizeWardrobePicks(input.wardrobe);
  if (!CHARACTER_WARDROBE_PARTS.some((part) => picks[part])) {
    throw new Error("請至少選擇一個造型部位");
  }
  const current = unwrap(await getCharacterAction(input.characterId)).character;
  const version = current.versions.find((item) => item.id === input.versionId);
  if (!version) throw new Error("版本不存在");
  if (version.status !== "completed") throw new Error("只能從已完成的版本編輯");

  const worn = detectCharacterWardrobePicks(
    [version.prompt, version.editInstruction].filter(Boolean).join("\n"),
  );
  const customPrompts = await resolveCustomWardrobePickPrompts(input.clerkUserId, picks);
  const customPromptMap = new Map(
    Object.entries(customPrompts).flatMap(([part, prompt]) => {
      const id = picks[part as keyof typeof picks];
      return id && prompt ? [[id, prompt] as const] : [];
    }),
  );
  const instruction = characterWardrobeEditInstruction(
    picks,
    input.note ?? "",
    worn.top,
    customPromptMap,
  );
  if (!instruction) throw new Error("請至少選擇一個造型部位");

  const creditsCharged = version.blueprintKind === "board" ? BLUEPRINT_COST : FRAME_COST;
  const character = unwrap(
    await editCharacterVersionAction(input.characterId, input.versionId, instruction),
  ).character;
  return { character, creditsCharged, editInstruction: instruction };
}
