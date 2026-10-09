import type { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection } from "@/dao";
import { submitImage } from "@/service/higgsfield/generate";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import {
  buildBlueprintPrompt,
  buildFullBodyPrompt,
  buildPortraitPrompt,
  buildProfilePrompt,
} from "@/service/character/blueprint-prompt";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { versionStyleId } from "@/service/character/character-styles";
import { characterReferenceUrls } from "@/service/character/reference-urls";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import type { Character, CharacterVersion } from "@/model/character";

export const BLUEPRINT_MODEL = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;

// Board images carry the face every scene copies, so they run at the top tier.
const BOARD_QUALITY = "high" as const;
const BOARD_RESOLUTION = "2k" as const;

export function isBoardVersion(version: Pick<CharacterVersion, "blueprintKind">) {
  return version.blueprintKind === "board";
}

// Parent board images for an edit: portrait, then full body. Empty for a root version.
function parentBoardImages(character: Character, version: CharacterVersion) {
  if (!version.parentVersionId) return [];
  const parent = character.versions.find((item) => item.id.equals(version.parentVersionId!));
  if (!parent || !isBoardVersion(parent)) return [];
  return [parent.portraitUrl, parent.profileUrl].filter((url): url is string => Boolean(url));
}

// Send one version's main image to the provider. No job write.
// Legacy sheet versions get the turnaround sheet; board versions get the identity portrait.
export async function sendCharacterVersion(
  character: Character,
  version: CharacterVersion,
): Promise<Sent> {
  const style = await loadRenderableStyle({
    styleId: versionStyleId(character, version),
    ownerClerkUserId: character.clerkUserId,
  });
  if (isBoardVersion(version)) {
    const photos = characterReferenceUrls(version);
    const parentImages = parentBoardImages(character, version).slice(0, 1);
    const submitted = await submitImage({
      model: BLUEPRINT_MODEL,
      prompt: buildPortraitPrompt({
        style,
        description: version.prompt,
        spec: version.spec,
        photoCount: photos.length,
        editInstruction: version.editInstruction,
        parentImageCount: parentImages.length,
      }),
      aspectRatio: "1:1",
      quality: BOARD_QUALITY,
      resolution: BOARD_RESOLUTION,
      referenceImageUrls: [...parentImages, ...photos],
    });
    return toSent(BLUEPRINT_MODEL, submitted);
  }
  const refs = characterReferenceUrls(version);
  const submitted = await submitImage({
    model: BLUEPRINT_MODEL,
    prompt: buildBlueprintPrompt({
      style,
      description: version.prompt,
      referenceCount: refs.length,
      editInstruction: version.editInstruction,
    }),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
    referenceImageUrls: refs,
  });
  return toSent(BLUEPRINT_MODEL, submitted);
}

// Board stage two: the standing figure drawn from the finished portrait.
export async function sendCharacterFullBody(
  character: Character,
  version: CharacterVersion,
): Promise<Sent> {
  if (!version.portraitUrl) throw new PermanentJobError("全身圖需要已完成的肖像");
  const style = await loadRenderableStyle({
    styleId: versionStyleId(character, version),
    ownerClerkUserId: character.clerkUserId,
  });
  const photos = characterReferenceUrls(version);
  // Edit: the parent's full body rides along so pose and framing stay put.
  const parentFullBody = version.editInstruction ? parentBoardImages(character, version)[1] : undefined;
  const parentImages = [version.portraitUrl, parentFullBody].filter((url): url is string => Boolean(url));
  const submitted = await submitImage({
    model: BLUEPRINT_MODEL,
    prompt: buildFullBodyPrompt({
      style,
      description: version.prompt,
      spec: version.spec,
      photoCount: photos.length,
      editInstruction: version.editInstruction,
      parentImageCount: parentImages.length,
    }),
    aspectRatio: "9:16",
    quality: BOARD_QUALITY,
    resolution: BOARD_RESOLUTION,
    referenceImageUrls: [...parentImages, ...photos],
  });
  return toSent(BLUEPRINT_MODEL, submitted);
}

// Legacy sheet follow-up: standing preview from the finished sheet. A failure here must not refund the blueprint.
export async function sendCharacterProfile(
  character: Character,
  version: CharacterVersion,
  options: { webhook?: boolean } = {},
): Promise<Sent> {
  if (!version.blueprintUrl) throw new PermanentJobError("全身預覽需要已完成的藍圖");
  const style = await loadRenderableStyle({
    styleId: versionStyleId(character, version),
    ownerClerkUserId: character.clerkUserId,
  });
  const submitted = await submitImage(
    {
      model: BLUEPRINT_MODEL,
      prompt: buildProfilePrompt({ style, description: version.prompt }),
      aspectRatio: "16:9",
      quality: "medium",
      resolution: "1k",
      referenceImageUrls: [version.blueprintUrl],
    },
    options,
  );
  return toSent(BLUEPRINT_MODEL, submitted);
}

// Queue the portrait after the sheet is saved. Skips when one is already stored or in flight.
export async function enqueueCharacterProfile(characterId: ObjectId, versionId: ObjectId) {
  const characters = await charactersCollection();
  const claimed = await characters.updateOne(
    {
      _id: characterId,
      versions: {
        $elemMatch: {
          id: versionId,
          profileUrl: { $exists: false },
          profileStatus: { $ne: "queued" },
        },
      },
    },
    { $set: { "versions.$.profileStatus": "queued", updatedAt: new Date() } },
  );
  if (claimed.modifiedCount !== 1) return;

  const jobs = await generationJobsCollection();
  const existing = await jobs.findOne({
    kind: "character",
    characterSlot: "profile",
    versionId,
    status: { $in: ["pending", "submitting", "queued", "in_progress"] },
  });
  if (existing) return;

  try {
    const id = await insertPendingJob({
      characterId,
      versionId,
      clipIndex: -1,
      kind: "character",
      characterSlot: "profile",
      model: BLUEPRINT_MODEL,
    });
    kickJob(id);
  } catch (error) {
    await characters.updateOne(
      { _id: characterId, "versions.id": versionId },
      { $set: { "versions.$.profileStatus": "failed", updatedAt: new Date() } },
    );
    throw error;
  }
}

// Queue the board's full-body image once the portrait is saved. The caller
// fails the version (and refunds) when this throws.
export async function enqueueCharacterFullBody(characterId: ObjectId, versionId: ObjectId) {
  const jobs = await generationJobsCollection();
  const existing = await jobs.findOne({
    kind: "character",
    characterSlot: "fullBody",
    versionId,
    status: { $in: ["pending", "submitting", "queued", "in_progress"] },
  });
  if (existing) return;
  const id = await insertPendingJob({
    characterId,
    versionId,
    clipIndex: -1,
    kind: "character",
    characterSlot: "fullBody",
    model: BLUEPRINT_MODEL,
  });
  kickJob(id);
}

// Queue one version's main image; the queue sends it and marks it failed + refunds on error.
export async function enqueueCharacterVersion(
  character: Character,
  version: CharacterVersion,
) {
  const jobs = await generationJobsCollection();
  // Retry reuses the version id; drop its settled jobs so the new one is the only one.
  // In-flight jobs stay so their provider request is never orphaned.
  await jobs.deleteMany({
    kind: "character",
    versionId: version.id,
    characterSlot: { $ne: "profile" },
    status: { $in: ["failed", "nsfw", "completed"] },
  });
  const id = await insertPendingJob({
    characterId: character._id,
    versionId: version.id,
    clipIndex: -1,
    kind: "character",
    model: BLUEPRINT_MODEL,
  });
  kickJob(id);
}
