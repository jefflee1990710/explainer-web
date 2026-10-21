import type { LifePoseFraming } from "@/model/life-pose";
import type { LifeCreateMode, LifeShotKind } from "@/model/life-shot-kind";

const FRAMING: Record<LifeShotKind, string> = {
  selfie: "A phone selfie at arm's length. The character looks into the lens. The place is visible behind them.",
  food: "A table-level food photo. The dish is in front. The character sits beside it with their face visible.",
  street: "A candid three-quarter street photo of the character walking, with the place readable behind them.",
  hobby: "A photo of the character doing the hobby named below, in this place.",
};

// Crop that matches the pose skeleton; replaces the shot-kind framing when no post type is set.
// Keep the person at natural human scale inside the scene — never blow them up to fill the frame.
const POSE_FRAMING: Record<LifePoseFraming, string> = {
  full: "Photographed by a friend standing a few metres back: show the whole body from head to feet standing on the scene's ground plane, sized to match the scene's architecture, walls, and railings, with generous room above the head and the surrounding environment visible.",
  knee: "Photographed by a friend: frame the body from the head down to just below the knees, keeping the person at natural scale against the surrounding walls, railings, and furniture.",
  half: "Frame the upper body from the head down to the waist, keeping the person at natural scale against the surrounding table, chairs, and room.",
};

// Objects a skeleton cannot show; spelled out so the hand is not left empty.
const POSE_PROPS: Record<string, string> = {
  drink: "The raised hand holds a cup or glass.",
  phone: "One hand holds a smartphone.",
  bag: "One hand holds a handbag or its strap.",
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

// Look of a real Hong Kong / Taiwan creator's Instagram post, taken from the downloaded IG set:
// - A friend's iPhone snapshot: deep focus, bright HDR exposure, evenly lit face (no dramatic side light).
// - Clean phone-processed skin, bright true-to-life colour, slightly imperfect off-centre framing.
export const LIFE_REALISTIC_RENDER_RULE = [
  "Camera: a real Instagram photo taken by a friend on an iPhone main camera (24mm wide lens) — the person and the background stays in focus together, with the slight wide-angle perspective of a phone held a couple of metres away; never a mirrorless or studio look, never 8K, ultra-realistic, hyperrealistic, masterpiece, cinematic, or editorial fashion shoot.",
  "Light: bright phone auto-exposure with HDR — shadows lifted, face evenly lit and well exposed by the place's own light (daylight, open shade, or bright indoor light); never dramatic side light, a half-dark face, moody low-key shadows, or rim light.",
  "Skin & styling: natural clean skin with the light phone noise reduction and gentle retouch a real creator posts, real hair with a few loose strands, real fabric folds; never waxy, plastic, or oily skin.",
  "Colour: bright, clean, true-to-life phone colour with clean whites and natural saturation; no film grain, retro filter, beige wash, or desaturated grade.",
  "Framing & expression: casual and slightly imperfect — the person not perfectly centred, the place filling a good part of the frame, the horizon maybe a little tilted; a relaxed natural expression (an easy smile showing teeth, laughing, or glancing away), not a fixed model smirk.",
].join(" ");

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];

// Reference order: identity, outfit preset (optional), scene (optional), annotated scene
// (only with a scene), composition (optional), pose skeleton (optional).
export function lifeReferenceOrder(input: {
  hasOutfitRef?: boolean;
  hasScene: boolean;
  hasAnnotatedImage: boolean;
  hasCompositionRef: boolean;
  hasPose?: boolean;
}) {
  let next = 1;
  const outfit = input.hasOutfitRef ? ++next : 0;
  const scene = input.hasScene ? ++next : 0;
  const annotated = input.hasScene && input.hasAnnotatedImage ? ++next : 0;
  const composition = input.hasCompositionRef ? ++next : 0;
  const pose = input.hasPose ? ++next : 0;
  return { outfit, scene, annotated, composition, pose };
}

// Identity is the first reference. The outfit preset, scene photo, numbered annotation guide,
// composition reference and pose skeleton follow in that order when present (see lifeReferenceOrder).
export function lifeShotPrompt(input: {
  name: string;
  kind: LifeShotKind;
  createMode?: LifeCreateMode;
  place?: string;
  interests: string[];
  customInstruction?: string;
  hasAnnotatedImage?: boolean;
  remarks?: LifeRemarkInput[];
  hasScene?: boolean;
  templateGuide?: string;
  hasCompositionRef?: boolean;
  poseText?: string;
  poseFraming?: LifePoseFraming;
  poseHands?: string[];
  hasOutfitRef?: boolean;
  outfitText?: string;
  hairText?: string;
}) {
  const hasScene = input.hasScene ?? true;
  const outfitText = input.outfitText?.trim() || "";
  const hairText = input.hairText?.trim() || "";
  const poseProps = (input.poseHands || []).map((h) => POSE_PROPS[h]).filter(Boolean);
  const poseText = [input.poseText?.trim() || "", ...(input.poseText?.trim() ? poseProps : [])]
    .filter(Boolean)
    .join(" ");
  const order = lifeReferenceOrder({
    hasOutfitRef: Boolean(input.hasOutfitRef),
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
    "A real vertical Instagram photo shot on an iPhone.",
    `The main person is ${input.name}. The first reference image is their identity blueprint — keep that exact face${order.outfit ? " and skin tone. Copy the hairstyle exactly from the outfit preset image: same length, colour, parting, and how it is worn (down, tied, or braided); do not restyle it" : ", hair, skin tone, and build"}, lit by the place's light rather than the flat reference-sheet lighting.`,
    order.outfit
      ? `The ${ordinal(order.outfit)} reference image is ${input.name}'s outfit preset (full body): dress them in exactly this outfit — same garments, colours, fit, shoes and accessories; do not add, remove or swap any item${instruction ? ", unless the edit instruction below asks for a different outfit" : ""}.`
      : `Dress them in exactly the outfit shown in the identity blueprint${instruction ? ", unless the edit instruction below asks for a different outfit" : ""}.`,
    hairText ? `Hair: ${hairText.replace(/\.$/, "")} (keep this exact hairstyle, do not tie it up unless the preset shows it tied).` : "",
    outfitText ? `Outfit: ${outfitText.replace(/\.$/, "")}.` : "",
    hasScene
      ? `The ${ordinal(order.scene)} reference image is the base scene/photograph (lighting direction, environment${order.composition ? "" : ", composition"}, and props). Keep this exact place — the same location, background, furniture and objects; never move them to a different location or add a new setting. Scale & perspective: size ${input.name} to true human height (~165 cm) for the camera distance and perspective of this scene — check parapet walls, railings, doorways, tables, tiles, and floor grid so the person is never oversized or giant against the background, with feet planted naturally on the ground plane.`
      : "No scene photo is given: build a believable real-world location that fits the location and post type below.",
    order.composition
      ? order.pose
        ? `The ${ordinal(order.composition)} reference image is a camera reference ONLY: copy its camera angle, framing and crop. Do NOT copy that person's pose, face, hair, outfit, or the background from it.`
        : `The ${ordinal(order.composition)} reference image is a composition reference ONLY: copy its pose, body angle, camera angle, framing and crop. Do NOT copy that person's face, hair, outfit, or the background from it.`
      : "",
    order.pose
      ? `The ${ordinal(order.pose)} reference image is a stick-figure pose skeleton (white circle = head, warm colours = the person's left limbs, cool colours = right limbs). Put ${input.name} in exactly this body pose: ${poseText} The skeleton pose wins over any pose described in the post type. Do NOT copy the skeleton's size on the canvas — scale ${input.name} to match the scene's perspective and nearby walls, railings, or furniture. The skeleton is a guide only — never draw its lines, dots or circle in the photo.`
      : "",
    input.createMode === "replace-person" && hasScene
      ? [
          `Replace the selected person in the ${ordinal(order.scene)} reference image with ${input.name} (matching ${input.name}'s exact face, hair, and preset outfit; keep any other unselected people and the exact background untouched).`,
          !order.pose
            ? `Keep the exact body pose, head angle, and hand gesture of the replaced person in the ${ordinal(order.scene)} image.`
            : "",
          instruction ? `Additional edit instruction: ${instruction}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : input.createMode === "scene-place" && hasScene
        ? [
            `Place ${input.name} naturally into the ${ordinal(order.scene)} reference scene photograph with matching directional lighting, ground shadows, and perspective.`,
            instruction ? `Scene placement description: ${instruction}` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : instruction
          ? `Edit / Scene instruction: ${instruction}`
          : hasScene
            ? `If the ${ordinal(order.scene)} image contains a person, replace that person with this character. Do not keep the other face.`
            : "",
    placeLine,
    templateGuide
      ? `Post type: ${templateGuide}`
      : poseText && input.poseFraming
        ? POSE_FRAMING[input.poseFraming]
        : !instruction
          ? FRAMING[input.kind]
          : "",
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
