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

// One turn of the chat used to edit a custom director.
export type DirectorChatMessage = {
  role: "user" | "assistant";
  content: string;
  changedPaths?: string[];
  createdAt: Date;
};

// Ordered profile fields shown for every director (shaped like a Phase A proposal).
export const PROFILE_KEYS = ["bestFor", "structure", "hook", "arc", "narrator", "visual", "audio", "rules"] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];
export type DirectorProfile = Record<ProfileKey, string>;
export type ProfileLocale = "en" | "zh-Hant";
// System directors carry a hand-written profile in both languages.
export type SystemProfile = Record<ProfileLocale, DirectorProfile>;

// Selectable generation skill stored in Mongo and seeded from repo markdown.
// Custom directors are user forks: they carry an owner and the template slug.
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
  ownerClerkUserId?: string;
  baseSlug?: string;
  chat?: DirectorChatMessage[];
  deletedAt?: Date;
  profile?: SystemProfile;
  customProfile?: DirectorProfile;
  extraInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
};

const aspectRatioSchema = z.enum(["16:9", "9:16", "1:1"]);

const profileSchema = z.object(
  Object.fromEntries(PROFILE_KEYS.map((key) => [key, z.string()])) as Record<ProfileKey, z.ZodString>,
);

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
  ownerClerkUserId: z.string().optional(),
  baseSlug: z.string().optional(),
  chat: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        changedPaths: z.array(z.string()).optional(),
        createdAt: z.date(),
      }),
    )
    .optional(),
  deletedAt: z.date().optional(),
  profile: z.object({ en: profileSchema, "zh-Hant": profileSchema }).optional(),
  customProfile: profileSchema.optional(),
  extraInstructions: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
