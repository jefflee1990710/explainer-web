import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import { styleIdSchema, type StyleId } from "@/model/style-id";

export type CharacterVersionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";

// One generated blueprint sheet. Versions are append-only.
export type CharacterVersion = {
  id: ObjectId;
  // Set when this version was made via「從此版本編輯」.
  parentVersionId?: ObjectId;
  // Full effective description used for this generation.
  prompt: string;
  editInstruction?: string;
  // Uploaded reference (v1) or the parent blueprint (edits).
  referenceImageUrl?: string;
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
  styleId: StyleId;
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
};

const characterVersionStatusSchema = z.enum([
  "queued",
  "in_progress",
  "completed",
  "failed",
]);

export const characterVersionSchema: z.ZodType<CharacterVersion> = z.object({
  id: objectIdSchema,
  parentVersionId: objectIdSchema.optional(),
  prompt: z.string(),
  editInstruction: z.string().optional(),
  referenceImageUrl: z.string().optional(),
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
  styleId: styleIdSchema,
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
});
