import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import { EDIT_LIMITS, bookendClipSchema, brandLayerSchema, type VideoTemplate } from "@/model/video-edit";

// Server-only: objectIdSchema needs the mongodb runtime.
export const videoTemplateSchema: z.ZodType<VideoTemplate> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string(),
  name: z.string().min(EDIT_LIMITS.templateName.min).max(EDIT_LIMITS.templateName.max),
  layers: z.array(brandLayerSchema),
  intro: bookendClipSchema.optional(),
  outro: bookendClipSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
