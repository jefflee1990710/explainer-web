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

// Real human camera capture rules for /app/life candid lifestyle photography:
// - Shot on modern human camera equipment (iPhone 16 Pro 24mm f/1.8 main camera, Sony ZV-E1 / A7C II mirrorless, or Ricoh GR III digital CMOS sensor; no heavy vintage 35mm film filter, no 8K/hyperrealistic buzzwords).
// - Natural available light from the scene's light source with clean, dimensional 1.2:1 to 1.5:1 portrait contrast, soft natural shadow roll-off on the far cheek, and clear nose-bridge shadow (overriding flat blueprint lighting).
// - Unfiltered real human skin with visible pores, fine peach-fuzz, and matte-natural finish with zero oily/plastic sheen or beauty-filter smoothing.
// - Clean true-to-life modern digital CMOS sensor color, unclipped highlights, neutral/cool highlights by default (warm only when a warm practical lamp, sunset, or fire is visible), and subtle natural ISO micro-texture without heavy 35mm film grain.
export const LIFE_REALISTIC_RENDER_RULE = [
  "Real human camera capture (shot on modern smartphone or creator camera equipment — iPhone 16 Pro 24mm f/1.8 main camera, Sony ZV-E1 mirrorless, or Ricoh GR III digital CMOS sensor; never heavy vintage 35mm film filter, never 8K, ultra-realistic, hyperrealistic, masterpiece, or AI beauty-mode):",
  "re-light the character's face and body strictly from the base scene's natural light source, sculpting the light-facing cheek with honest directional key light, a clean 1.2:1 to 1.5:1 cheek-to-cheek contrast ratio, soft natural shadow falloff on the far cheek, and a clear nose-bridge shadow (override any flat front lighting from the first identity reference image; never flat front beauty-ring light, never dark moody cinema blackouts, zero unmotivated rim light from the dark shadow side).",
  "Skin & texture: unfiltered real human skin with visible pores, fine peach-fuzz catching the light, natural uneven skin tone with subsurface scattering, matte-natural finish with zero oily, waxy, or plastic specular sheen on the forehead, nose, cheeks, or collarbones (override any beauty-filter smoothing), loose flyaway hair strands, and real fabric weave.",
  "Colour & exposure: clean true-to-life modern digital CMOS sensor color (no heavy 35mm film grain or retro Kodak LUT); keep highlights neutral or cool by default, reserving warm highlights strictly for scenes with a visible warm practical lamp, fire, or sunset in frame; keep glowing sources and bright skies below pure-white clipping; in extreme dark scenes keep 90% of shadows neutral-desaturated with colour only on the light source; lift the black point in underwater, fog, or smoke scenes (with blue-shifted underwater shadows and neutral night shadows); add subtle natural ISO 100–400 digital sensor micro-texture and natural optical depth of field.",
].join(" ");

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

// Reference order: identity, scene (optional), annotated scene (only with a scene),
// composition (optional), pose skeleton (optional).
export function lifeReferenceOrder(input: {
  hasScene: boolean;
  hasAnnotatedImage: boolean;
  hasCompositionRef: boolean;
  hasPose?: boolean;
}) {
  let next = 1;
  const scene = input.hasScene ? ++next : 0;
  const annotated = input.hasScene && input.hasAnnotatedImage ? ++next : 0;
  const composition = input.hasCompositionRef ? ++next : 0;
  const pose = input.hasPose ? ++next : 0;
  return { scene, annotated, composition, pose };
}

// Identity is the first reference. The scene photo, the numbered annotation guide, a
// composition reference and a pose skeleton follow in that order when present (see lifeReferenceOrder).
export function lifeShotPrompt(input: {
  name: string;
  kind: LifeShotKind;
  place?: string;
  interests: string[];
  customInstruction?: string;
  hasAnnotatedImage?: boolean;
  remarks?: LifeRemarkInput[];
  hasScene?: boolean;
  templateGuide?: string;
  hasCompositionRef?: boolean;
  poseText?: string;
}) {
  const hasScene = input.hasScene ?? true;
  const poseText = input.poseText?.trim() || "";
  const order = lifeReferenceOrder({
    hasScene,
    hasAnnotatedImage: Boolean(input.hasAnnotatedImage),
    hasCompositionRef: Boolean(input.hasCompositionRef),
    hasPose: Boolean(poseText),
  });
  const ordinal = (n: number) => ORDINALS[n - 1] || `#${n}`;
  const hobby = input.interests[0] ? `Hobby: ${input.interests[0]}.` : "";
  const placeLine = input.place?.trim() ? `Location: ${input.place.trim()}.` : "";
  const instruction = input.customInstruction?.trim() || "";
  const templateGuide = input.templateGuide?.trim() || "";
  const activeRemarks = (input.remarks || []).filter((r) => r.comment.trim().length > 0);
  const remarkLines =
    activeRemarks.length > 0
      ? [
          order.annotated
            ? `The ${ordinal(order.annotated)} reference image is an annotated guide of the ${ordinal(order.scene)} image with numbered colored markings (#1, #2, #3...). Each colored mark shows the exact area to modify according to its numbered instruction below:`
            : "Apply these numbered edits to the scene:",
          ...activeRemarks.map(
            (r) => `- #${r.number} (${r.colorName}): ${r.comment.trim()}`,
          ),
          "CRITICAL: the colored markings and #1/#2/#3 numbers are editing instructions ONLY — NEVER reproduce, draw, or leave any colored annotation strokes, circles, arrows, or #1/#2/#3 numbers in the final generated photograph.",
        ].join("\n")
      : "";

  return [
    "Authentic candid vertical photograph shot on modern human camera equipment (iPhone 16 Pro / Sony ZV-E1).",
    `The main person is ${input.name}. The first reference image is their identity blueprint — keep that exact face, hair, skin tone, and build, but re-light their face to match the scene's directional light rather than copying flat reference-sheet lighting.`,
    hasScene
      ? `The ${ordinal(order.scene)} reference image is the base scene/photograph (lighting direction, environment${order.composition ? "" : ", composition"}, and props).`
      : "No scene photo is given: build a believable real-world location that fits the location and post type below.",
    order.composition
      ? order.pose
        ? `The ${ordinal(order.composition)} reference image is a camera reference ONLY: copy its camera angle, framing and crop. Do NOT copy that person's pose, face, hair, outfit, or the background from it.`
        : `The ${ordinal(order.composition)} reference image is a composition reference ONLY: copy its pose, body angle, camera angle, framing and crop. Do NOT copy that person's face, hair, outfit, or the background from it.`
      : "",
    order.pose
      ? `The ${ordinal(order.pose)} reference image is a stick-figure pose skeleton (white circle = head, warm colours = the person's left limbs, cool colours = right limbs). Put ${input.name} in exactly this body pose: ${poseText} The skeleton is a guide only — never draw its lines, dots or circle in the photo.`
      : "",
    instruction
      ? `Edit / Scene instruction: ${instruction}`
      : hasScene
        ? `If the ${ordinal(order.scene)} image contains a person, replace that person with this character. Do not keep the other face.`
        : "",
    placeLine,
    templateGuide ? `Post type: ${templateGuide}` : !instruction ? FRAMING[input.kind] : "",
    !instruction && !templateGuide ? hobby : "",
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
