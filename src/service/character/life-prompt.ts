import type { LifeShotKind } from "@/model/life-shot-kind";

const FRAMING: Record<LifeShotKind, string> = {
  selfie: "A phone selfie at arm's length. The character looks into the lens. The place is visible behind them.",
  food: "A table-level food photo. The dish is in front. The character sits beside it with their face visible.",
  street: "A candid three-quarter street photo of the character walking, with the place readable behind them.",
  hobby: "A photo of the character doing the hobby named below, in this place.",
};

// Search words for a real place photo. The hit is a scene reference, not the final picture.
export function lifeSceneQuery(input: { place: string; kind: LifeShotKind; interest?: string }) {
  const place = input.place.trim();
  if (input.kind === "food") return `${place} local food dish`;
  if (input.kind === "street") return `${place} street`;
  if (input.kind === "hobby") return `${place} ${input.interest?.trim() || "everyday life"}`;
  return `${place} viewpoint`;
}

export type LifeRemarkInput = {
  number: number;
  colorName: string;
  comment: string;
};

// 12 De-Plastic Rules ("去塑膠感的十二條") for /app/life candid lifestyle photography:
// - Rule 01: Honest 35mm camera capture (Kodak Gold 200 / Ektachrome on Ricoh GR III / Canon AE-1; no 8K/hyperrealistic buzzwords).
// - Rule 03 & 04: Lift black point in underwater/fog/smoke scenes (blue-shifted underwater shadows, neutral night shadows).
// - Rule 05: In extreme dark scenes keep 90% of shadows neutral-desaturated with chroma only on the light source.
// - Rule 06: Keep glowing light sources and bright skies below pure-white clipping with subtle halation.
// - Rule 07: Subtle 35mm film grain with slightly lifted shadow blacks so grain is never swallowed by crushed zero-blacks.
// - Rule 09 & 10: Per-shot scene-motivated contrast; neutral/cool highlights by default (warm only when a warm practical lamp, sunset, or fire is visible).
// - Rule 11: Grazing directional key light from the scene's light source with 1.4:1 to 1.8:1 cheek-to-cheek contrast ratio, 25–40% shadow roll-off, negative fill on the far cheek, clear nose-bridge shadow, overriding flat blueprint lighting, and matte-natural skin pores with zero oily/plastic sheen.
export const LIFE_REALISTIC_RENDER_RULE = [
  "Realistic light & camera (35mm film capture on Kodak Gold 200 or Ektachrome with Ricoh GR III / Canon AE-1 optics; never 8K, ultra-realistic, hyperrealistic, masterpiece, or AI beauty-mode):",
  "re-light the character's face and body strictly from the base scene's natural light source, sculpting the light-facing cheek with grazing directional key light, a 1.4:1 to 1.8:1 cheek-to-cheek contrast ratio, 25–40% natural shadow falloff, negative fill on the far cheek, and a clear nose-bridge shadow (override any flat front lighting from the first identity reference image; never flat front beauty light, never even front fill, zero unmotivated rim light from the dark shadow side).",
  "Skin & texture: authentic unretouched human skin with visible pores, fine peach-fuzz catching the key light, natural uneven skin tone with subsurface scattering, matte-natural finish with zero oily, waxy, or plastic specular sheen on the forehead, nose, cheeks, or collarbones (override any beauty-filter smoothing), loose flyaway hair strands, and real fabric weave.",
  "Colour & exposure: keep highlights neutral or cool by default, reserving warm highlights strictly for scenes with a visible warm practical lamp, fire, or sunset in frame; keep glowing sources and bright skies below pure-white clipping with subtle halation; in extreme dark scenes keep 90% of shadows neutral-desaturated with colour only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral night shadows); add subtle 35mm film grain with slightly lifted shadow blacks so grain is never swallowed by crushed zero-blacks, plus slight optical chromatic aberration and natural optical depth of field.",
].join(" ");

// Identity is the first reference. The second image supplies the clean scene/base photo,
// and an optional third image carries numbered color annotations (#1, #2, #3...) for spatial guidance.
export function lifeShotPrompt(input: {
  name: string;
  kind: LifeShotKind;
  place?: string;
  interests: string[];
  customInstruction?: string;
  hasAnnotatedImage?: boolean;
  remarks?: LifeRemarkInput[];
}) {
  const hobby = input.interests[0] ? `Hobby: ${input.interests[0]}.` : "";
  const placeLine = input.place?.trim() ? `Location: ${input.place.trim()}.` : "";
  const instruction = input.customInstruction?.trim() || "";
  const activeRemarks = (input.remarks || []).filter((r) => r.comment.trim().length > 0);
  const remarkLines =
    activeRemarks.length > 0
      ? [
          input.hasAnnotatedImage
            ? "The third reference image is an annotated guide of the second image with numbered colored markings (#1, #2, #3...). Each colored mark shows the exact area to modify according to its numbered instruction below:"
            : "Apply these numbered edits to the scene:",
          ...activeRemarks.map(
            (r) => `- #${r.number} (${r.colorName}): ${r.comment.trim()}`,
          ),
          "CRITICAL: the colored markings and #1/#2/#3 numbers are editing instructions ONLY — NEVER reproduce, draw, or leave any colored annotation strokes, circles, arrows, or #1/#2/#3 numbers in the final generated photograph.",
        ].join("\n")
      : "";

  return [
    "Authentic candid 35mm vertical photograph.",
    `The main person is ${input.name}. The first reference image is their identity blueprint — keep that exact face, hair, skin tone, and build, but re-light their face to match the scene's directional light rather than copying flat reference-sheet lighting.`,
    "The second reference image is the base scene/photograph (lighting direction, environment, composition, and props).",
    instruction
      ? `Edit / Scene instruction: ${instruction}`
      : "If the second image contains a person, replace that person with this character. Do not keep the other face.",
    placeLine,
    !instruction ? FRAMING[input.kind] : "",
    !instruction ? hobby : "",
    LIFE_REALISTIC_RENDER_RULE,
    remarkLines,
    "Output a clean, candid photograph with no text, no watermark, and no annotation marks.",
  ]
    .filter(Boolean)
    .join(" ");
}

export type LifeSceneHit = {
  title: string;
  thumbUrl: string;
  pageUrl?: string;
};

const SKIP_TITLE = /portrait|headshot|selfie|mugshot|id[_ -]?photo/i;

// Wikimedia Commons search payload → scene stills the picker can show.
export function parseCommonsImageSearch(payload: unknown): LifeSceneHit[] {
  const pages = (payload as { query?: { pages?: Record<string, unknown> } })?.query?.pages;
  if (!pages || typeof pages !== "object") return [];
  const hits: LifeSceneHit[] = [];
  for (const page of Object.values(pages)) {
    if (!page || typeof page !== "object") continue;
    const record = page as {
      title?: string;
      imageinfo?: Array<{ thumburl?: string; mime?: string; descriptionurl?: string }>;
    };
    const title = record.title || "";
    const info = record.imageinfo?.[0];
    const mime = info?.mime || "";
    const thumbUrl = info?.thumburl || "";
    if (!thumbUrl.startsWith("https://")) continue;
    if (!/^image\/(jpeg|png|webp)$/i.test(mime)) continue;
    if (SKIP_TITLE.test(title)) continue;
    hits.push({
      title: title.replace(/^File:/, ""),
      thumbUrl,
      pageUrl: info?.descriptionurl,
    });
    if (hits.length >= 8) break;
  }
  return hits;
}
