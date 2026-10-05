import type { ObjectId } from "mongodb";
import { z } from "zod";
import { characterVoiceSchema, type CharacterVoice } from "@/model/character-voice";
import { objectIdSchema } from "@/model/primitives";

export type CharacterVersionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";

// One generated blueprint sheet. Versions are append-only.
export type CharacterVersion = {
  id: ObjectId;
  // Omitted on rows created before a character could hold more than one style.
  styleId?: string;
  // Set when this version was made via「從此版本編輯」.
  parentVersionId?: ObjectId;
  // Full effective description used for this generation.
  prompt: string;
  editInstruction?: string;
  // Uploaded references (v1). Edits store the parent sheet first, then those root photos.
  // `referenceImageUrl` is the first photo; keep both so older rows still read.
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  // Blob URL once the sheet is persisted.
  blueprintUrl?: string;
  status: CharacterVersionStatus;
  error?: string;
  creditsCharged: boolean;
  createdAt: Date;
  // When the current generation attempt was sent to the provider.
  submittedAt?: Date;
};

// Reusable character owned by one user.
export type Character = {
  _id: ObjectId;
  userId: ObjectId;
  clerkUserId: string;
  name: string;
  styleId: string;
  // Fixed acoustic lock pasted into dialogue clips. Not part of the blueprint.
  voice?: CharacterVoice;
  defaultVersionId?: ObjectId;
  versions: CharacterVersion[];
  createdAt: Date;
  updatedAt: Date;
};

// Snapshot of a character's default version stored on a video at creation.
export type CastMember = {
  characterId: ObjectId;
  versionId: ObjectId;
  name: string;
  blueprintUrl: string;
  prompt: string;
  voice?: CharacterVoice;
};

const characterVersionStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "failed",
]);

export const characterVersionSchema: z.ZodType<CharacterVersion> = z.object({
  id: objectIdSchema,
  styleId: z.string().optional(),
  parentVersionId: objectIdSchema.optional(),
  prompt: z.string(),
  editInstruction: z.string().optional(),
  referenceImageUrl: z.string().optional(),
  referenceImageUrls: z.array(z.string()).optional(),
  blueprintUrl: z.string().optional(),
  status: characterVersionStatusSchema,
  error: z.string().optional(),
  creditsCharged: z.boolean(),
  createdAt: z.date(),
  submittedAt: z.date().optional(),
});

export const characterSchema: z.ZodType<Character> = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  clerkUserId: z.string(),
  name: z.string(),
  styleId: z.string(),
  voice: characterVoiceSchema.optional(),
  defaultVersionId: objectIdSchema.optional(),
  versions: z.array(characterVersionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const castMemberSchema: z.ZodType<CastMember> = z.object({
  characterId: objectIdSchema,
  versionId: objectIdSchema,
  name: z.string(),
  blueprintUrl: z.string(),
  prompt: z.string(),
  voice: characterVoiceSchema.optional(),
});
