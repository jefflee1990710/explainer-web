import * as z from "zod";
import { PRODUCT_MAX } from "@/model/product-constants";
import { importBrandAsset, importReferenceImage } from "@/service/project/reference-image-import";

// Matches the create-video form. The action still validates language, cast, and logo.
export const videoBriefFields = {
  source: z
    .string()
    .min(1)
    .describe("Director instruction: how to plan the video; may include the topic or a full script"),
  spokenScript: z
    .string()
    .optional()
    .describe(
      "Talking-head only: exact words the character reads. Required when skillSlug is talking-head-director or full-body-talking-head-director.",
    ),
  referenceImages: z
    .array(
      z.object({
        url: z.string().url().describe("Public PNG/JPG/WebP image, ≤ 5MB"),
        description: z.string().trim().min(1).max(300).describe("What it shows and how the director should use it"),
      }),
    )
    .max(4)
    .optional()
    .describe("Scene references; the director assigns them to clips and reuses them for scene stills"),
  skillSlug: z.string().default("cartoon-explainer").describe("Director skill slug from list_skills"),
  styleId: z.string(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  durationPreset: z.enum(["auto", "micro", "short", "punchy", "full"]),
  language: z.string().default("en"),
  voiceGender: z.enum(["male", "female"]).default("male"),
  speechPace: z.enum(["slow", "medium", "fast"]).default("medium").describe("Speaking speed for narration / dialogue"),
  sceneTextLanguage: z
    .enum(["en", "zh-Hant", "zh-Hans"])
    .default("en")
    .describe("On-canvas text is always on; this picks its script"),
  characterIds: z
    .array(z.string())
    .max(4)
    .optional()
    .describe("Required: exactly 2 ids when skillSlug is dialogue-qa-director"),
  productIds: z.array(z.string()).max(PRODUCT_MAX).optional().describe("Product ids from list_products"),
  logoUrl: z
    .string()
    .url()
    .optional()
    .describe("Opening/ending skills only. Public image or a URL from import_brand_asset."),
};

// Update and restart replace the brief. Required fields have no defaults, so an omitted language cannot silently become English.
export const videoBriefUpdateFields = {
  ...videoBriefFields,
  skillSlug: z.string().min(1).describe("Director skill slug from list_skills"),
  language: z.string().min(1),
  voiceGender: z.enum(["male", "female"]),
  speechPace: z.enum(["slow", "medium", "fast"]),
  sceneTextLanguage: z.enum(["en", "zh-Hant", "zh-Hans"]),
};

export type VideoBriefArgs = {
  source: string;
  spokenScript?: string;
  referenceImages?: Array<{ url: string; description: string }>;
  skillSlug?: string;
  styleId: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationPreset: "auto" | "micro" | "short" | "punchy" | "full";
  language?: string;
  voiceGender?: "male" | "female";
  speechPace?: "slow" | "medium" | "fast";
  sceneTextLanguage?: "en" | "zh-Hant" | "zh-Hans";
  characterIds?: string[];
  productIds?: string[];
  logoUrl?: string;
};

// Copy a brief onto the FormData the project actions already read.
export async function fillVideoBrief(form: FormData, args: VideoBriefArgs, clerkUserId: string) {
  form.set("source", args.source);
  if (args.spokenScript) form.set("spokenScript", args.spokenScript);
  form.set("skillSlug", args.skillSlug || "cartoon-explainer");
  form.set("styleId", args.styleId);
  form.set("aspectRatio", args.aspectRatio);
  form.set("durationPreset", args.durationPreset);
  form.set("language", args.language || "en");
  form.set("voiceGender", args.voiceGender || "male");
  form.set("speechPace", args.speechPace || "medium");
  form.set("sceneTextLanguage", args.sceneTextLanguage || "en");
  for (const id of args.characterIds || []) form.append("characterIds", id);
  for (const id of args.productIds || []) form.append("productIds", id);
  if (args.logoUrl) {
    const asset = await importBrandAsset(args.logoUrl, clerkUserId);
    if (asset.kind !== "image") throw new Error("Logo 只支援 PNG、JPG、WebP");
    form.set("logoUrl", asset.url);
  }
  const references: Array<{ url: string; description: string }> = [];
  for (const item of args.referenceImages || []) {
    references.push({
      url: await importReferenceImage(item.url, clerkUserId),
      description: item.description,
    });
  }
  if (references.length) form.set("referenceImages", JSON.stringify(references));
}
