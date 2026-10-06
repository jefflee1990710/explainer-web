import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import { productShotSchema, type ProductShot } from "@/model/product";
import {
  POSTER_LAYOUT_IDS,
  type PosterLayer,
  type PosterLayoutId,
  type PostPreviewStatus,
} from "@/model/post-layers";

export type {
  PosterLayer,
  PosterLayout,
  PosterLayoutId,
  PosterShapeKind,
  PosterShapeLayer,
  PosterTextLayer,
  PosterTextRole,
  PostPreviewStatus,
  PublicPost,
} from "@/model/post-layers";

export {
  INSTRUCTION_MAX,
  POSTER_CANVAS,
  POSTER_FILLS,
  POSTER_LAYOUT_IDS,
  SLOT_CHAR_LIMITS,
  isPosterLayoutId,
} from "@/model/post-layers";

// One user's poster. Layers are the editor source of truth.
export type Post = {
  _id: ObjectId;
  clerkUserId: string;
  layoutId: PosterLayoutId;
  instruction: string;
  layers: PosterLayer[];
  // Optional cast and style, same idea as a video. Products stay realistic.
  styleId?: string;
  cast?: Array<{ characterId: ObjectId; name: string; blueprintUrl: string }>;
  products?: ProductShot[];
  previewUrl?: string;
  thumbnailUrl?: string;
  previewStatus: PostPreviewStatus;
  previewJobId?: ObjectId;
  // Set while a charged preview can still be refunded.
  previewSpendKey?: string;
  aspectRatio: "2:3";
  createdAt: Date;
  updatedAt: Date;
};

const shapeLayerSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  shape: z.enum([
    "rect",
    "circle",
    "quarterCircle",
    "semicircle",
    "triangle",
    "lineStack",
    "ellipse",
    "blob",
  ]),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fill: z.string(),
  axis: z.enum(["horizontal", "vertical"]).optional(),
  corner: z.enum(["tl", "tr", "bl", "br"]).optional(),
  side: z.enum(["top", "bottom", "left", "right"]).optional(),
});

const textLayerSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  role: z.enum(["mark", "headline", "subhead", "body"]),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fontSize: z.number(),
  fontWeight: z.union([z.literal(500), z.literal(700)]),
  align: z.enum(["left", "center", "right"]),
  color: z.string(),
  vertical: z.boolean().optional(),
  tracking: z.number().optional(),
});

export const posterLayerSchema = z.discriminatedUnion("type", [shapeLayerSchema, textLayerSchema]);

export const postSchema: z.ZodType<Post> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  layoutId: z.enum(POSTER_LAYOUT_IDS),
  instruction: z.string(),
  layers: z.array(posterLayerSchema),
  styleId: z.string().optional(),
  cast: z
    .array(z.object({ characterId: objectIdSchema, name: z.string(), blueprintUrl: z.string() }))
    .optional(),
  products: z.array(productShotSchema).optional(),
  previewUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  previewStatus: z.enum(["generating", "ready", "failed"]),
  previewJobId: objectIdSchema.optional(),
  previewSpendKey: z.string().optional(),
  aspectRatio: z.literal("2:3"),
  createdAt: z.date(),
  updatedAt: z.date(),
});
