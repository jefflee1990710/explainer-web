import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";

export type SkillReference = {
  path: string;
  content: string;
};

export type SkillInputSchema = {
  requiresSource: boolean;
  aspectRatios: Array<"16:9" | "9:16" | "1:1">;
  durationPresets: string[];
  optionalCharacterImage: boolean;
};

export type HiggsfieldDefaults = {
  imageModel: string;
  imageQuality: "low" | "medium" | "high";
  imageResolution: "1k" | "2k" | "4k";
  videoModel: string;
};

// Selectable generation skill stored in Mongo and seeded from repo markdown.
export type Skill = {
  _id: ObjectId;
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  systemPrompt: string;
  references: SkillReference[];
  inputSchema: SkillInputSchema;
  higgsfieldDefaults: HiggsfieldDefaults;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);

export const skillSchema: z.ZodType<Skill> = z.object({
  _id: objectIdSchema,
  slug: z.string(),
  title: z.string(),
  titleZh: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  references: z.array(z.object({ path: z.string(), content: z.string() })),
  inputSchema: z.object({
    requiresSource: z.boolean(),
    aspectRatios: z.array(aspectRatioSchema),
    durationPresets: z.array(z.string()),
    optionalCharacterImage: z.boolean(),
  }),
  higgsfieldDefaults: z.object({
    imageModel: z.string(),
    imageQuality: z.enum(["low", "medium", "high"]),
    imageResolution: z.enum(["1k", "2k", "4k"]),
    videoModel: z.string(),
  }),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
