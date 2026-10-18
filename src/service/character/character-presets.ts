import { ObjectId } from "mongodb";
import type { Character, CharacterPreset, CharacterVersion } from "@/model/character";
import type { PublicCharacter, PublicCharacterPreset } from "@/presentation/serialize";
import { resolveVersionForStyle, versionStyleId } from "@/service/character/character-styles";
import { canSetDefault } from "@/service/character/versions";

export type CharacterPresetSelection = {
  versionId?: string;
  presetId?: string;
  presetName?: string;
};

export type CharacterSelectionMap = Record<string, CharacterPresetSelection>;

// Safely parse JSON map of characterId -> { versionId, presetId, presetName } from FormData.
export function parseCharacterSelections(raw: string): CharacterSelectionMap {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: CharacterSelectionMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!ObjectId.isValid(key) || !value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      const entry = value as Record<string, unknown>;
      const versionId =
        typeof entry.versionId === "string" && ObjectId.isValid(entry.versionId)
          ? entry.versionId
          : undefined;
      const presetId =
        typeof entry.presetId === "string" && ObjectId.isValid(entry.presetId)
          ? entry.presetId
          : undefined;
      const presetName =
        typeof entry.presetName === "string" && entry.presetName.trim()
          ? entry.presetName.trim().slice(0, 60)
          : undefined;
      if (versionId || presetId) {
        result[key] = {
          ...(versionId ? { versionId } : {}),
          ...(presetId ? { presetId } : {}),
          ...(presetName ? { presetName } : {}),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

// Resolve the chosen blueprint version (or style default) for a character in a video.
export function resolveCastVersion(
  character: Character,
  styleId: string,
  selection?: CharacterPresetSelection,
): {
  version: CharacterVersion | null;
  preset?: CharacterPreset;
} {
  if (selection?.presetId && ObjectId.isValid(selection.presetId)) {
    const presetObjId = new ObjectId(selection.presetId);
    const preset = (character.presets || []).find((p) => p.id.equals(presetObjId));
    if (preset) {
      const target = character.versions.find((v) => v.id.equals(preset.versionId));
      if (target && canSetDefault(target) && versionStyleId(character, target) === styleId) {
        return { version: target, preset };
      }
    }
  }

  if (selection?.versionId && ObjectId.isValid(selection.versionId)) {
    const verObjId = new ObjectId(selection.versionId);
    const target = character.versions.find((v) => v.id.equals(verObjId));
    if (target && canSetDefault(target) && versionStyleId(character, target) === styleId) {
      const matchingPreset = (character.presets || []).find((p) => p.versionId.equals(target.id));
      return { version: target, ...(matchingPreset ? { preset: matchingPreset } : {}) };
    }
  }

  return { version: resolveVersionForStyle(character, styleId) };
}

export type SearchablePresetItem = {
  character: PublicCharacter;
  preset: PublicCharacterPreset;
};

// Filter presets across characters by styleId and free-text query (matches preset name, edit instruction, or character name).
export function filterCharacterPresets(
  characters: PublicCharacter[],
  styleId: string,
  query: string,
): SearchablePresetItem[] {
  const q = query.trim().toLowerCase();
  const items: SearchablePresetItem[] = [];
  for (const character of characters) {
    for (const preset of character.presets || []) {
      if (preset.styleId !== styleId) continue;
      if (
        !q ||
        preset.name.toLowerCase().includes(q) ||
        character.name.toLowerCase().includes(q) ||
        (preset.editInstruction && preset.editInstruction.toLowerCase().includes(q))
      ) {
        items.push({ character, preset });
      }
    }
  }
  return items;
}
