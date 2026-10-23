import type { ObjectId } from "mongodb";
import type { CharacterLookCategory, CharacterWardrobePart } from "@/service/character/character-look";

export const CUSTOM_WARDROBE_NAME_MAX = 60;
export const CUSTOM_WARDROBE_PROMPT_MAX = 420;

export interface CustomWardrobeItem {
  _id?: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  part: CharacterWardrobePart;
  category: Exclude<CharacterLookCategory, "all">;
  name: string;
  nameZh?: string;
  prompt: string;
  referenceImageUrl: string;
  previewImageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicCustomWardrobeItem {
  id: string;
  optionId: string;
  part: CharacterWardrobePart;
  category: Exclude<CharacterLookCategory, "all">;
  name: string;
  nameZh: string;
  prompt: string;
  referenceImageUrl: string;
  previewImageUrl: string;
  createdAt: string;
}

export function customWardrobeOptionId(hexId: string): string {
  return `cw_${hexId}`;
}

export function parseCustomWardrobeHexId(optionId: string): string | null {
  if (!optionId.startsWith("cw_")) return null;
  const hex = optionId.slice(3);
  return /^[a-f0-9]{24}$/i.test(hex) ? hex : null;
}

export function toPublicCustomWardrobeItem(
  doc: CustomWardrobeItem & { _id: ObjectId },
): PublicCustomWardrobeItem {
  const hexId = doc._id.toHexString();
  return {
    id: hexId,
    optionId: customWardrobeOptionId(hexId),
    part: doc.part,
    category: doc.category,
    name: doc.name,
    nameZh: doc.nameZh || doc.name,
    prompt: doc.prompt,
    referenceImageUrl: doc.referenceImageUrl,
    previewImageUrl: doc.previewImageUrl || doc.referenceImageUrl,
    createdAt: doc.createdAt.toISOString(),
  };
}
