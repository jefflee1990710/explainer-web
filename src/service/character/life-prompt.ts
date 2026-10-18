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

// Identity is the first reference. The second image only supplies the place.
export function lifeShotPrompt(input: {
  name: string;
  kind: LifeShotKind;
  place: string;
  interests: string[];
}) {
  const hobby = input.interests[0] ? `Hobby: ${input.interests[0]}.` : "";
  return [
    "Photorealistic new vertical photograph.",
    `The person is ${input.name}. The first reference image is their identity. Keep that same face, hair, and build.`,
    "The second reference image is only the place, objects, food, and lighting.",
    "If the second image contains a person, replace that person with this character. Do not keep the other face.",
    `Location: ${input.place}.`,
    FRAMING[input.kind],
    hobby,
    "No text, no watermark, no extra people in the foreground.",
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
