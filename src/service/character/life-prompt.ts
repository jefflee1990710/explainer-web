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
    "Photorealistic vertical photograph.",
    `The main person is ${input.name}. The first reference image is their identity blueprint. Keep that exact face, hair, skin tone, and build.`,
    "The second reference image is the base scene/photograph (lighting, environment, composition, and props).",
    instruction
      ? `Edit / Scene instruction: ${instruction}`
      : "If the second image contains a person, replace that person with this character. Do not keep the other face.",
    placeLine,
    !instruction ? FRAMING[input.kind] : "",
    !instruction ? hobby : "",
    remarkLines,
    "Output a clean, natural photograph with no text, no watermark, and no annotation marks.",
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
