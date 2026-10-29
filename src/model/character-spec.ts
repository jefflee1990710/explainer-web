import { z } from "zod";

// Structured appearance notes for one character. Written by Gemini from the
// uploaded photos, stored on the blueprint version, and pasted into director
// and frame prompts as a text anchor next to the attached blueprint images.
export type CharacterSpec = {
  // e.g. "woman, late 20s"
  identity: string;
  // Face shape, eyes, brows, nose, mouth, jaw — proportions only, no judgement.
  face: string;
  // Measured face geometry (eye spacing, mouth width, lid type...). Blueprint prompts only; too long for frame prompts.
  faceDetail?: string;
  // Style, length, colour, parting, texture.
  hair: string;
  skinTone: string;
  // Build, height impression, posture.
  body: string;
  // Moles, scars, glasses, freckles, dimples — anything that identifies the person.
  marks: string;
  // Garments, colours, shoes, accessories as seen in the photos.
  outfit: string;
  // Up to 4 hex colours: hair, skin, main garment, accent.
  palette: string[];
  // One extra line the other fields do not say.
  notes?: string;
};

const line = z.string().trim().max(240);

export const characterSpecSchema: z.ZodType<CharacterSpec> = z.object({
  identity: line,
  face: line,
  faceDetail: z.string().trim().max(600).optional(),
  hair: line,
  skinTone: line,
  body: line,
  marks: line,
  outfit: line,
  // The model sometimes appends a colour name; the parser keeps only the hex.
  palette: z.array(z.string().trim().max(80)).max(4),
  notes: line.optional(),
});

// Null when the value is not a usable spec. Blank fields are dropped.
export function parseCharacterSpec(value: unknown): CharacterSpec | null {
  const parsed = characterSpecSchema.safeParse(value);
  if (!parsed.success) return null;
  const spec = parsed.data;
  if (!spec.identity && !spec.face && !spec.hair) return null;
  return {
    ...spec,
    palette: spec.palette.filter((item) => /^#?[0-9a-f]{6}$/i.test(item)).map(normalizeHex),
    faceDetail: spec.faceDetail || undefined,
    notes: spec.notes || undefined,
  };
}

function normalizeHex(value: string) {
  return value.startsWith("#") ? value.toLowerCase() : `#${value.toLowerCase()}`;
}

// Labelled fields for a UI list, blanks skipped.
export const CHARACTER_SPEC_FIELDS = [
  "identity",
  "face",
  "hair",
  "skinTone",
  "body",
  "marks",
  "outfit",
  "notes",
] as const satisfies ReadonlyArray<keyof CharacterSpec>;

export type CharacterSpecField = (typeof CHARACTER_SPEC_FIELDS)[number];

// Strip beauty-filter terms ("smooth matte finish", "flawless", "porcelain") from stored specs
// so image models do not render waxy plastic skin from a filtered reference selfie.
export function sanitizeSpecSkinTone(skinTone: string) {
  return skinTone
    .replace(
      /\bsmooth(?:\s+matte)?(?:\s+finish|\s+skin|\s+complexion)?\b|\b(?:flawless|porcelain|airbrushed|glossy|dewy|glass)\s*(?:skin|finish|complexion|texture)?\b/gi,
      "visible natural pores, matte-natural skin micro-texture",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Strip baked-in portrait smile words ("wide smile", "showing upper teeth", "smiling almond eyes")
// from stored face geometry so talking-head start frames do not lock raised apple-cheek smile tension
// that lip-sync video models amplify into squinting eyes and exaggerated toothy grins.
export function sanitizeSpecFace(face: string) {
  return face
    .replace(/\bsmiling\s+(?=(?:almond\s+)?eyes\b)/gi, "")
    .replace(
      /\b(?:wide|broad|bright|big|toothy|full)\s+smil(?:e|ing)(?:\s+mouth)?(?:\s+showing\s+(?:upper\s+)?teeth)?\b/gi,
      "natural well-proportioned lips gently closed",
    )
    .replace(/\bshowing\s+(?:upper\s+|white\s+)?teeth\b/gi, "lips gently closed")
    .replace(/\brounded\s+cheekbones\b/gi, "soft natural cheekbones")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
}

// One compact line for image prompts. Frame prompts share a tight character cap,
// so this stays short and skips the palette (the attached image carries colour).
// Put `outfit` right after `identity` & `hair` so `outfit` is NEVER truncated when
// `faceDetail` is long.
export function characterSpecLine(spec: CharacterSpec, maxChars = 480) {
  const skin = spec.skinTone ? sanitizeSpecSkinTone(spec.skinTone) : "";
  const faceCombined = [spec.face, spec.faceDetail]
    .filter(Boolean)
    .map((part) => sanitizeSpecFace(part!))
    .join(", ");
  const parts = [
    spec.identity,
    spec.outfit && `outfit: ${spec.outfit}`,
    spec.hair && `hair: ${spec.hair}`,
    faceCombined && `face: ${faceCombined}`,
    skin && `skin: ${skin}`,
    spec.body && `build: ${spec.body}`,
    spec.marks && `marks: ${spec.marks}`,
  ].filter((part): part is string => Boolean(part));
  const text = parts.join("; ");
  return text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
}

// Multi-line block for the blueprint prompts, where there is room for every field.
export function characterSpecBlock(spec: CharacterSpec) {
  const rows: string[] = [];
  const skin = spec.skinTone ? sanitizeSpecSkinTone(spec.skinTone) : "";
  if (spec.identity) rows.push(`- Identity: ${spec.identity}`);
  if (spec.face) rows.push(`- Face: ${spec.face}`);
  if (spec.faceDetail) rows.push(`- Face geometry: ${spec.faceDetail}`);
  if (spec.hair) rows.push(`- Hair: ${spec.hair}`);
  if (skin) rows.push(`- Skin: ${skin}`);
  if (spec.body) rows.push(`- Body: ${spec.body}`);
  if (spec.marks) rows.push(`- Marks: ${spec.marks}`);
  if (spec.outfit) rows.push(`- Outfit: ${spec.outfit}`);
  if (spec.palette.length) rows.push(`- Palette: ${spec.palette.join(", ")}`);
  if (spec.notes) rows.push(`- Notes: ${spec.notes}`);
  return rows.join("\n");
}
