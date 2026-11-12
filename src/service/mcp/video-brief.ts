import * as z from "zod";
import { PRODUCT_MAX } from "@/model/product-constants";
import { VIDEO_QUALITY_TIERS, type VideoQualityTier } from "@/model/project";
import { SUBTITLE_LOOK_IDS, type SubtitleLook } from "@/model/subtitle-look-id";
import { TALKING_HEAD_POSE_IDS, type TalkingHeadPoseId } from "@/model/talking-head-options";
import { importBrandAsset, importReferenceImage } from "@/service/project/reference-image-import";
import { coerceDiagramExplainerOnScreenText } from "@/service/director/explainer-family";

// Matches the create-video form. The action still validates language, cast, and logo.
export const videoBriefFields = {
  source: z
    .string()
    .default("")
    .describe(
      "Director instruction: how to plan the video. Required unless skillSlug is a talking-head director, where this note is optional and must stay different from spokenScript.",
    ),
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
  videoQualityTier: z
    .enum(VIDEO_QUALITY_TIERS)
    .optional()
    .describe(
      "Video generation tier: '2k_cinema' (2 credits/s, OpenRouter MiniMax H3). Defaults to '2k_cinema'.",
    ),
  talkingHeadPoseId: z
    .enum(TALKING_HEAD_POSE_IDS)
    .optional()
    .describe("Talking-head framing pose: collarbone-close, waist-up, full-body, or handheld-selfie"),
  language: z.string().default("en"),
  voiceGender: z.enum(["male", "female"]).default("male"),
  speechPace: z.enum(["slow", "medium", "fast"]).default("medium").describe("Speaking speed for narration / dialogue"),
  sceneTextLanguage: z
    .enum(["en", "zh-Hant", "zh-Hans", "ja", "ko", "none"])
    .default("en")
    .describe(
      "On-canvas text script. none leaves the picture without writing, except whiteboard and paper-cutout explainers, which always keep writing.",
    ),
  onScreenTextStyleId: z
    .enum(SUBTITLE_LOOK_IDS)
    .optional()
    .describe(
      "Artistic on-screen font for whiteboard and paper-cutout explainers. Those directors always paint every clip and cannot choose none. Defaults to clean.",
    ),
  subtitleLook: z
    .enum(SUBTITLE_LOOK_IDS)
    .default("handwritten")
    .describe("Subtitle lettering only. Where the subtitle sits is chosen by the director."),
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
  sceneTextLanguage: z.enum(["en", "zh-Hant", "zh-Hans", "ja", "ko", "none"]),
  subtitleLook: z.enum(SUBTITLE_LOOK_IDS),
};

export type VideoBriefArgs = {
  source?: string;
  spokenScript?: string;
  referenceImages?: Array<{ url: string; description: string }>;
  skillSlug?: string;
  styleId: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationPreset: "auto" | "micro" | "short" | "punchy" | "full";
  videoQualityTier?: VideoQualityTier;
  talkingHeadPoseId?: TalkingHeadPoseId;
  language?: string;
  voiceGender?: "male" | "female";
  speechPace?: "slow" | "medium" | "fast";
  sceneTextLanguage?: "en" | "zh-Hant" | "zh-Hans" | "ja" | "ko" | "none";
  onScreenTextStyleId?: SubtitleLook;
  subtitleLook?: SubtitleLook;
  characterIds?: string[];
  productIds?: string[];
  logoUrl?: string;
};

// Copy a brief onto the FormData the project actions already read.
export async function fillVideoBrief(form: FormData, args: VideoBriefArgs, clerkUserId: string) {
  form.set("source", args.source || "");
  if (args.spokenScript) form.set("spokenScript", args.spokenScript);
  form.set("skillSlug", args.skillSlug || "cartoon-explainer");
  form.set("styleId", args.styleId);
  form.set("aspectRatio", args.aspectRatio);
  form.set("durationPreset", args.durationPreset);
  if (args.videoQualityTier) form.set("videoQualityTier", args.videoQualityTier);
  if (args.talkingHeadPoseId) form.set("talkingHeadPoseId", args.talkingHeadPoseId);
  form.set("language", args.language || "en");
  form.set("voiceGender", args.voiceGender || "male");
  form.set("speechPace", args.speechPace || "medium");
  const explainerOnScreen = coerceDiagramExplainerOnScreenText({
    skillSlug: args.skillSlug,
    language: args.language,
    sceneTextLanguage: args.sceneTextLanguage,
    onScreenTextStyleId: args.onScreenTextStyleId,
  });
  form.set(
    "sceneTextLanguage",
    (explainerOnScreen?.sceneTextLanguage ?? args.sceneTextLanguage) || "en",
  );
  if (explainerOnScreen) {
    form.set("onScreenTextStyleId", explainerOnScreen.onScreenTextStyleId);
    form.set("onScreenTextCoverage", explainerOnScreen.onScreenTextCoverage);
  }
  form.set("subtitleLook", args.subtitleLook || "handwritten");
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
