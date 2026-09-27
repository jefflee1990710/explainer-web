import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

// Where a brand layer sits; margin applies to the anchored edges.
export const BRAND_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const;
export type BrandAnchor = (typeof BRAND_ANCHORS)[number];

// Shared bounds for UI sliders, zod, and uploads.
export const EDIT_LIMITS = {
  marginPct: { min: 0, max: 20 },
  widthPct: { min: 2, max: 100 },
  opacity: { min: 0, max: 1 },
  imageDurationSec: { min: 1, max: 10, default: 2 },
  templateName: { min: 1, max: 60 },
  imageBytes: 5 * 1024 * 1024,
  videoBytes: 50 * 1024 * 1024,
} as const;

// Logo or picture drawn over the whole main reel.
export type BrandLayer = {
  id: string;
  kind: "image";
  assetUrl: string;
  anchor: BrandAnchor;
  marginPct: number;
  widthPct: number;
  opacity: number;
};

// Intro or outro. Images last `durationSec`; videos use their own length.
export type BookendClip = {
  kind: "video" | "image";
  assetUrl: string;
  durationSec: number;
};

// Array order is stacking order; the last layer is on top.
export type VideoEdit = {
  layers: BrandLayer[];
  intro?: BookendClip;
  outro?: BookendClip;
};

export type VideoTemplate = VideoEdit & {
  _id: ObjectId;
  clerkUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export function emptyEdit(): VideoEdit {
  return { layers: [] };
}

const L = EDIT_LIMITS;

export const brandLayerSchema: z.ZodType<BrandLayer> = z.object({
  id: z.string().min(1).max(64),
  kind: z.literal("image"),
  assetUrl: z.string().url(),
  anchor: z.enum(BRAND_ANCHORS),
  marginPct: z.number().min(L.marginPct.min).max(L.marginPct.max),
  widthPct: z.number().min(L.widthPct.min).max(L.widthPct.max),
  opacity: z.number().min(L.opacity.min).max(L.opacity.max),
});

export const bookendClipSchema: z.ZodType<BookendClip> = z.object({
  kind: z.enum(["video", "image"]),
  assetUrl: z.string().url(),
  durationSec: z.number().min(L.imageDurationSec.min).max(L.imageDurationSec.max),
});

export const videoEditSchema: z.ZodType<VideoEdit> = z.object({
  layers: z.array(brandLayerSchema),
  intro: bookendClipSchema.optional(),
  outro: bookendClipSchema.optional(),
});

export const videoTemplateSchema: z.ZodType<VideoTemplate> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  name: z.string().min(L.templateName.min).max(L.templateName.max),
  layers: z.array(brandLayerSchema),
  intro: bookendClipSchema.optional(),
  outro: bookendClipSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
