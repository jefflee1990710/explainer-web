import type { ObjectId } from "mongodb";
import { z } from "zod";

// Framing tiers observed across downloaded Instagram posts.
export const IG_POST_FRAMINGS = [
  "full_body",
  "knee_up",
  "half_body",
  "upper_body",
  "face_closeup",
] as const;

export type IgPostFraming = (typeof IG_POST_FRAMINGS)[number];

// Shot-type taxonomy from the Instagram post extraction pipeline.
export const IG_POST_SHOT_TYPES = [
  "ootd_full_body",
  "posed_portrait",
  "mirror_selfie",
  "arm_selfie",
  "candid_moment",
  "talking_head",
  "back_view",
  "product_showcase",
  "group_shot",
  "other",
] as const;

export type IgPostShotType = (typeof IG_POST_SHOT_TYPES)[number];

// Scene settings observed in downloaded Instagram post images.
export const IG_POST_SETTINGS = [
  "street_urban",
  "cafe_restaurant",
  "home_living",
  "bedroom",
  "office_work",
  "studio_plain_wall",
  "shop_mall",
  "nature_park",
  "beach_water",
  "travel_landmark",
  "event_party",
  "gym_sport",
  "car",
  "transport",
  "other",
] as const;

export type IgPostSetting = (typeof IG_POST_SETTINGS)[number];

// Available catalog wardrobe IDs (cloth + shoe + accessory + optional hair) that make up a recommended combination.
export const WardrobeCombinationItemsSchema = z.object({
  // Upper-body cloth ID from CHARACTER_TOPS
  top: z.string().min(1),
  // Lower-body cloth ID from CHARACTER_PANTS
  pants: z.string().min(1),
  // Footwear ID from CHARACTER_SHOES
  shoes: z.string().min(1),
  // Accessory ID from CHARACTER_ACCESSORIES
  accessory: z.string().min(1),
  // Optional hairstyle ID from CHARACTER_HAIRSTYLES
  hair: z.string().min(1).optional(),
});

export type WardrobeCombinationItems = z.infer<typeof WardrobeCombinationItemsSchema>;

// Provenance linking the combination back to the downloaded Instagram post image.
export const WardrobeCombinationSourcePostSchema = z.object({
  // Instagram handle (e.g. "yeyedamei", "_tnnn26", "formunawei", "pickleballcentral")
  account: z.string().min(1),
  // Instagram post shortcode (e.g. "DWOQlkrkkNm")
  shortcode: z.string().min(1),
  // Relative path under experiments/ to the downloaded post image (e.g. "_tnnn26-instagram/posts/015_DWOQlkrkkNm.jpg")
  imageFile: z.string().min(1),
  // Framing of the subject in the post image
  framing: z.enum(IG_POST_FRAMINGS),
  // Shot archetype of the post image
  shotType: z.enum(IG_POST_SHOT_TYPES),
  // Scene / location category of the post image
  setting: z.enum(IG_POST_SETTINGS),
});

export type WardrobeCombinationSourcePost = z.infer<typeof WardrobeCombinationSourcePostSchema>;

// Raw garment descriptions extracted from the Instagram image before mapping to catalog IDs.
export const WardrobeCombinationExtractedRawSchema = z.object({
  top: z.string().optional(),
  pants: z.string().optional(),
  shoes: z.string().optional(),
  accessory: z.string().optional(),
  hair: z.string().optional(),
});

export type WardrobeCombinationExtractedRaw = z.infer<typeof WardrobeCombinationExtractedRawSchema>;

// Schema for a recommended outfit combination distilled from a downloaded Instagram post image.
export const WardrobeCombinationSchema = z.object({
  // Stable unique identifier (e.g. "combo-tnnn26-bolero-tierskirt")
  id: z.string().min(1),
  // English display title for the outfit combination
  nameEn: z.string().min(1),
  // Traditional Chinese display title for the outfit combination
  nameZh: z.string().min(1),
  // Concise styling note describing the silhouette, color story, and vibe
  description: z.string().min(1),
  // Matched available wardrobe catalog IDs (cloth: top + pants, shoe: shoes, accessory, optional hair)
  items: WardrobeCombinationItemsSchema,
  // Recommended Life post template ID (from LIFE_POST_TEMPLATES) that matches the IG post scene
  recommendedTemplateId: z.string().min(1).optional(),
  // Recommended Life pose ID (from LIFE_POSES) that matches the IG post skeleton
  recommendedPoseId: z.string().min(1).optional(),
  // Searchable aesthetic, activity, and regional tags
  tags: z.array(z.string().min(1)).min(1),
  // Source Instagram post metadata and local image path
  sourcePost: WardrobeCombinationSourcePostSchema,
  // Optional raw garment descriptions from the vision extractor
  extractedRaw: WardrobeCombinationExtractedRawSchema.optional(),
});

export type WardrobeCombination = z.infer<typeof WardrobeCombinationSchema>;

// MongoDB document shape for persisting recommended combinations in `wardrobe_combinations`.
export interface WardrobeCombinationDoc extends WardrobeCombination {
  _id?: ObjectId;
  // Optional owner user ID for user-saved combinations (undefined for global IG-distilled combinations)
  clerkUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public DTO returned to UI components and MCP tools.
export interface PublicWardrobeCombination extends WardrobeCombination {
  tags: string[];
}

export function toPublicWardrobeCombination(
  combo: WardrobeCombination,
): PublicWardrobeCombination {
  return {
    id: combo.id,
    nameEn: combo.nameEn,
    nameZh: combo.nameZh,
    description: combo.description,
    items: { ...combo.items },
    recommendedTemplateId: combo.recommendedTemplateId,
    recommendedPoseId: combo.recommendedPoseId,
    tags: [...combo.tags],
    sourcePost: { ...combo.sourcePost },
    extractedRaw: combo.extractedRaw ? { ...combo.extractedRaw } : undefined,
  };
}
