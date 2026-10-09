import type { ObjectId } from "mongodb";
import { z } from "zod";
import { characterSpecSchema, type CharacterSpec } from "@/model/character-spec";
import { characterVoiceSchema, type CharacterVoice } from "@/model/character-voice";
import { objectIdSchema } from "@/model/primitives";

export type CharacterVersionStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";

// "sheet": legacy single turnaround / expression sheet (one image job).
// "board": identity portrait + full-body standing, composed into one board (two image jobs).
export type CharacterBlueprintKind = "sheet" | "board";

// Which image a board version is waiting on. Unset once the board is composed.
export type CharacterBlueprintStage = "portrait" | "fullBody";

// One generated blueprint. Versions are append-only.
export type CharacterVersion = {
  id: ObjectId;
  // Omitted on rows created before a character could hold more than one style.
  styleId?: string;
  // Set when this version was made via「從此版本編輯」.
  parentVersionId?: ObjectId;
  // Full effective description used for this generation.
  prompt: string;
  editInstruction?: string;
  // Uploaded references. Legacy sheet edits store the parent sheet first, then the
  // root photos; board versions always store the root photos only.
  // `referenceImageUrl` is the first photo; keep both so older rows still read.
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
  // Missing on rows created before boards existed.
  blueprintKind?: CharacterBlueprintKind;
  // Board versions: which image job is running now.
  stage?: CharacterBlueprintStage;
  // Board versions: identity close-up (1:1) persisted to Blob.
  portraitUrl?: string;
  // Blob URL once the sheet (legacy) or the composed board is persisted.
  blueprintUrl?: string;
  // Full-body standing figure for cards, pickers, and scene locks.
  profileUrl?: string;
  // Legacy sheet versions: set while the follow-up portrait job is in flight, or after it fails.
  profileStatus?: "queued" | "failed";
  // Appearance notes read from the photos. Pasted into scene prompts next to the images.
  spec?: CharacterSpec;
  status: CharacterVersionStatus;
  error?: string;
  creditsCharged: boolean;
  // Credits taken for this version. Missing on rows charged before boards (FRAME_COST).
  creditsCost?: number;
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
  // Character-level preview. Matches the original style's chosen sheet.
  defaultVersionId?: ObjectId;
  // One chosen sheet per style. Missing styles fall back to defaultVersionId when it belongs to that style.
  styleDefaults?: Record<string, ObjectId>;
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
  // Missing on videos cast before boards existed (a sheet).
  blueprintKind?: CharacterBlueprintKind;
  prompt: string;
  spec?: CharacterSpec;
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
  blueprintKind: z.enum(["sheet", "board"]).optional(),
  stage: z.enum(["portrait", "fullBody"]).optional(),
  portraitUrl: z.string().optional(),
  blueprintUrl: z.string().optional(),
  profileUrl: z.string().optional(),
  profileStatus: z.enum(["queued", "failed"]).optional(),
  spec: characterSpecSchema.optional(),
  status: characterVersionStatusSchema,
  error: z.string().optional(),
  creditsCharged: z.boolean(),
  creditsCost: z.number().optional(),
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
  styleDefaults: z.record(z.string(), objectIdSchema).optional(),
  versions: z.array(characterVersionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const castMemberSchema: z.ZodType<CastMember> = z.object({
  characterId: objectIdSchema,
  versionId: objectIdSchema,
  name: z.string(),
  blueprintUrl: z.string(),
  blueprintKind: z.enum(["sheet", "board"]).optional(),
  prompt: z.string(),
  spec: characterSpecSchema.optional(),
  voice: characterVoiceSchema.optional(),
});
