import { generateText, Output } from "ai";
import { characterSpecSchema, parseCharacterSpec, type CharacterSpec } from "@/model/character-spec";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { directorModel } from "@/service/director/model";

// Up to this many photos are read. More adds latency without new detail.
const MAX_SPEC_PHOTOS = 6;

const SYSTEM = `You describe one person's appearance so an image model can redraw them consistently.
Read every attached photo as the same person. Return only the fields.
Write short noun phrases in English, separated by commas. No sentences, no opinions, no guesses about personality.
identity: apparent gender and age range, e.g. "woman, late 20s".
face: face shape, eye shape and spacing, eyebrows, nose, lips, jaw and chin — proportions an artist needs.
hair: style, length, parting, texture, colour.
skinTone: one plain phrase, e.g. "light warm beige".
body: build, height impression, shoulders, posture.
marks: moles, scars, freckles, dimples, glasses, piercings, facial hair — anything that identifies the person. Write "none" if nothing stands out.
outfit: garments, colours, shoes, accessories as seen in the clearest photo. If the photos disagree, pick the most common outfit.
palette: up to 4 hex colours only, like #1a1a1a — hair, skin, main garment, one accent. No words.
notes: at most one extra identifying detail the other fields do not say, or leave empty.
Never mention the photo background, lighting, pose, or camera.`;

export type ExtractSpecInput = {
  name: string;
  description: string;
  referenceImageUrls: string[];
};

// Reads the photos (and the typed description) into a CharacterSpec.
// Returns null when there is nothing to read or the model call fails;
// the blueprint then runs on images alone, as before.
export async function extractCharacterSpec(input: ExtractSpecInput): Promise<CharacterSpec | null> {
  const urls = input.referenceImageUrls.filter(Boolean).slice(0, MAX_SPEC_PHOTOS);
  if (urls.length === 0) return null;
  try {
    const images = await loadDirectorImageParts(urls);
    const text = [
      `Name: ${input.name}`,
      input.description
        ? `User description (may add role or clothing hints; the photos win for the face): ${input.description}`
        : "User description: (none)",
      `Photos attached: ${images.length}`,
    ].join("\n");
    const { output } = await generateText({
      model: directorModel(),
      output: Output.object({ schema: characterSpecSchema }),
      system: SYSTEM,
      messages: [{ role: "user", content: [{ type: "text", text }, ...images] }],
    });
    return parseCharacterSpec(output);
  } catch (error) {
    console.error("character spec extract failed", error);
    return null;
  }
}