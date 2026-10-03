import type { ObjectId } from "mongodb";
import { z } from "zod";
import { PROFILE_KEYS, type DirectorProfile, type ProfileKey, type SystemProfile } from "@/model/director-profile";
import { objectIdSchema } from "@/model/primitives";

export {
  PROFILE_KEYS,
  type DirectorProfile,
  type ProfileKey,
  type SystemProfile,
} from "@/model/director-profile";

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

// Selectable generation skill stored in Mongo and seeded from repo markdown.
// Custom directors are user forks: they carry an owner and the template slug.
export type Skill = {
  _id: ObjectId;
  slug: string;
  title: string;
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
  // System-director card still. Custom directors inherit the template's url at serialize time.
  previewUrl?: string;
  previewHash?: string;
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
  profile: profileSchema.optional(),
  customProfile: profileSchema.optional(),
  extraInstructions: z.string().optional(),
  previewUrl: z.string().optional(),
  previewHash: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
