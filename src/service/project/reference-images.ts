import type { Project, ReferenceImage } from "@/model/project";

export const MAX_REFERENCE_IMAGES = 4;
export const REFERENCE_DESCRIPTION_MAX = 300;

export type ReferenceImagesParse =
  | { ok: true; images: ReferenceImage[] }
  | { ok: false; error: string };

function stringField(item: unknown, key: string) {
  if (!item || typeof item !== "object") return "";
  const value = (item as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

// Brief JSON → validated images. Client ids are ignored; order decides R1..Rn.
export function parseReferenceImages(
  raw: string,
  isAllowedUrl: (url: string) => boolean,
): ReferenceImagesParse {
  if (!raw.trim()) return { ok: true, images: [] };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "參考圖資料無效" };
  }
  if (!Array.isArray(data)) return { ok: false, error: "參考圖資料無效" };
  if (data.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, error: `參考圖最多 ${MAX_REFERENCE_IMAGES} 張` };
  }
  const images: ReferenceImage[] = [];
  for (const [index, item] of data.entries()) {
    const url = stringField(item, "url");
    const description = stringField(item, "description");
    if (!description) return { ok: false, error: "請為每張參考圖填寫說明" };
    if (description.length > REFERENCE_DESCRIPTION_MAX) {
      return { ok: false, error: `參考圖說明最多 ${REFERENCE_DESCRIPTION_MAX} 字` };
    }
    if (!url || !isAllowedUrl(url)) return { ok: false, error: "參考圖來源無效，請重新上傳" };
    images.push({ id: `R${index + 1}`, url, description });
  }
  return { ok: true, images };
}

// Keep only ids that exist, once each, in R1..Rn order; drop the field when empty.
export function sanitizeClipReferenceIds<T extends { referenceImageIds?: string[] }>(
  clips: T[],
  images: ReferenceImage[] | undefined,
): T[] {
  const known = (images || []).map((image) => image.id);
  return clips.map((clip) => {
    const { referenceImageIds, ...rest } = clip;
    const ids = known.filter((id) => referenceImageIds?.includes(id));
    return (ids.length ? { ...rest, referenceImageIds: ids } : rest) as T;
  });
}

// URLs of the reference images the director assigned to one clip.
export function clipReferenceImageUrls(
  project: Pick<Project, "phaseA" | "referenceImages">,
  clipNumber: number,
): string[] {
  const row = project.phaseA?.clips.find((clip) => clip.clipNumber === clipNumber);
  const ids = row?.referenceImageIds || [];
  return (project.referenceImages || [])
    .filter((image) => ids.includes(image.id))
    .map((image) => image.url);
}

export function referenceImageLabel(image: ReferenceImage) {
  return `Reference image ${image.id}: ${image.description}`;
}

// True when the brief or a reference note says the clothes follow a reference image.
// A scene photo never replaces the selected character's face or hair.
const CLOTHING_FOLLOW_REF =
  /(?:follow(?:ing)?|match(?:ing)?|copy(?:ing)?|wear(?:ing)?|dress(?:ed)?(?:\s+like)?)\s+(?:the\s+)?(?:cloth(?:es|ing)?|outfit|wardrobe|garments?)\b[\s\S]{0,48}\b(?:reference|ref\b|photo|image|picture|pic\b)|(?:cloth(?:es|ing)?|outfit|wardrobe|garments?)\b[\s\S]{0,40}\b(?:from|in|on)\s+(?:the\s+)?(?:reference|photo|image|picture)|follow(?:ing)?\s+(?:the\s+)?(?:reference|ref\b|photo|image|picture)[\s\S]{0,40}\b(?:cloth(?:es|ing)?|outfit|wardrobe|garments?)|clothing\s+reference|(?:衣服|服裝|件衫|衫褲|外套).{0,10}(?:跟|按照|依照|跟住).{0,10}(?:參考圖|參考|呢張圖|圖片)|(?:跟|按照|依照|跟住).{0,16}(?:參考圖|參考|呢張圖).{0,12}(?:衣服|服裝|件衫|外套|衫)|參考圖.{0,10}(?:的)?(?:衣服|服裝|件衫|外套)|穿.{0,6}(?:參考圖|圖入面|圖中).{0,6}(?:衣服|服裝|衫)/i;

export function instructionFollowsReferenceClothes(texts: Array<string | undefined>) {
  const blob = texts.filter((text): text is string => Boolean(text && text.trim())).join("\n");
  if (!blob) return false;
  return CLOTHING_FOLLOW_REF.test(blob);
}

// System rules for Phase A; empty when the brief has no reference images.
export function phaseAReferenceImageRules(
  images: ReferenceImage[],
  options?: { clothingOnly?: boolean; clothingFromInstruction?: boolean },
) {
  if (images.length === 0) return "";
  const ids = images.map((image) => image.id).join(", ");
  // Outfit reels use the photo for the clothes, not the person or the room.
  if (options?.clothingOnly) {
    return [
      `The user attached clothing reference images ${ids}.`,
      "They are clothes only. List the distinct garments you can see and put those on, one per clip.",
      "Copy cut, colour, and details from the photo. Do not copy the person, face, hair, pose, tattoos, or the room.",
      "Tag every dressing clip with the reference id that shows that garment.",
      "Do not invent a garment the photos do not show.",
    ].join(" ");
  }
  const clothes = options?.clothingFromInstruction
    ? "The instruction says the clothes follow a reference image. Copy only those garments, and name them in the scene. Do not copy the wearer."
    : "Clothes stay on the selected character. Do not redress them from a reference image unless the instruction explicitly says the clothes follow that image.";
  return [
    `The user attached scene reference images ${ids}, each labelled with its description in the user message.`,
    "Use them for place, product, props, and composition.",
    "Do not copy the person, face, or hairstyle in a reference image. The on-screen person is always the selected character. Lock face and hair to that character in every clip.",
    clothes,
    "For each clip whose scene should follow a reference, list its id(s) in that clip's referenceImageIds.",
    "Only tag clips the image truly fits. One image may serve several clips. You do not have to use every image, and most clips may have none.",
    "When a clip has referenceImageIds, its scene fields describe the place, product, and action that image shows — never a different person's face, hair, or body.",
  ].join(" ");
}
