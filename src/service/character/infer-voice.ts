import { generateText, Output } from "ai";
import { z } from "zod";
import type { Character } from "@/model/character";
import { characterVoiceSchema, parseCharacterVoice, type CharacterVoice } from "@/model/character-voice";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { resolveDefaultVersion } from "@/service/character/versions";
import { DEFAULT_CHARACTER_VOICE } from "@/service/director/character-voice";
import { directorModel } from "@/service/director/model";

const SYSTEM = `Pick one voice lock for this one character.
Return only the fields. Do not write a sentence in note.
Infer gender and age from the description or the photos.
A child uses age young-adult, pitch mid-high or high, and weight light.
If the voice is not described, choose a plain voice that matches the apparent gender and age.
note is one extra acoustic detail the other fields do not already say, 50 characters max.
Examples: slight Hong Kong accent, a little raspy, soft breath.`;

// note is sliced to 50 after the call, so a slightly long phrase still counts.
const inferVoiceSchema = characterVoiceSchema.omit({ note: true }).extend({
  note: z.string(),
});

// Used when the model call fails, so create still turns a lock on.
export function fallbackCharacterVoice(description: string): CharacterVoice {
  const text = description.toLowerCase();
  const female = /女|姐|姊|妹|媽|娘|woman|girl|female|lady/.test(text);
  const child = /小孩|兒童|男孩|女孩|\d+\s*歲|year-old|child|kid/.test(text);
  const older = /老人|爺|奶|elderly|older/.test(text);
  if (child) {
    return {
      gender: female ? "female" : "male",
      age: "young-adult",
      pitch: "mid-high",
      resonance: "bright",
      texture: "crisp",
      weight: "light",
    };
  }
  if (older) {
    return {
      gender: female ? "female" : "male",
      age: "older",
      pitch: "low",
      resonance: "chesty",
      texture: "warm",
      weight: "heavy",
    };
  }
  return {
    ...DEFAULT_CHARACTER_VOICE,
    gender: female ? "female" : "male",
  };
}

// Default completed blueprint, then one reference photo. Null when no sheet exists yet.
export function characterBlueprintVoiceInput(
  character: Pick<Character, "name" | "defaultVersionId" | "versions">,
): { name: string; description: string; referenceImageUrls: string[] } | null {
  const version = resolveDefaultVersion(character);
  const blueprint = version?.blueprintUrl?.trim();
  if (!version || !blueprint) return null;
  const photos = (version.referenceImageUrls?.length
    ? version.referenceImageUrls
    : version.referenceImageUrl
      ? [version.referenceImageUrl]
      : []
  )
    .map((url) => url.trim())
    .filter((url) => url && url !== blueprint);
  // A board's close-up portrait reads age and gender better than the whole board.
  const face = version.portraitUrl?.trim() || blueprint;
  return {
    name: character.name,
    description: version.prompt,
    referenceImageUrls: [face, ...photos.filter((url) => url !== face)].slice(0, 2),
  };
}

// Reads the description and up to two photos, then enables a voice lock.
export async function inferCharacterVoice(input: {
  name: string;
  description: string;
  referenceImageUrls?: string[];
}): Promise<CharacterVoice> {
  try {
    const urls = (input.referenceImageUrls || []).slice(0, 2);
    let images: Awaited<ReturnType<typeof loadDirectorImageParts>> = [];
    if (urls.length) {
      try {
        images = await loadDirectorImageParts(urls);
      } catch (error) {
        console.error("character voice image fetch failed", error);
      }
    }
    const text = `Name: ${input.name}\nDescription: ${input.description || "(none; use the photos)"}`;
    const { output } = await generateText({
      model: directorModel(),
      output: Output.object({ schema: inferVoiceSchema }),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text }, ...images],
        },
      ],
    });
    const parsed = parseCharacterVoice(output);
    if (parsed) return { ...parsed, weight: parsed.weight ?? "medium" };
  } catch (error) {
    console.error("character voice infer failed", error);
  }
  return fallbackCharacterVoice(`${input.name}\n${input.description}`);
}
