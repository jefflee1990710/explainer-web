import type { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection } from "@/dao";
import { submitImage } from "@/service/higgsfield/generate";
import { imageModelForRealism } from "@/service/generation/image-backend";
import {
  buildBlueprintPrompt,
  buildFullBodyPrompt,
  buildPortraitPrompt,
  buildProfilePrompt,
} from "@/service/character/blueprint-prompt";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { isRealisticStyle } from "@/service/style/realistic-light";
import { versionStyleId } from "@/service/character/character-styles";
import { characterReferenceUrls, rootVersionOf } from "@/service/character/reference-urls";
import { cumulativeWardrobeEdit, portraitWardrobeEditText } from "@/service/character/wardrobe-edit";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import type { Character, CharacterVersion } from "@/model/character";

// Illustrated character boards. Realistic styles use Nano Banana Pro at send time.
export const BLUEPRINT_MODEL = imageModelForRealism(false);

// Board images carry the face every scene copies, so they run at the top tier.
const BOARD_QUALITY = "high" as const;
const BOARD_RESOLUTION = "2k" as const;

export function isBoardVersion(version: Pick<CharacterVersion, "blueprintKind">) {
  return version.blueprintKind === "board";
}

// Immediate parent board images (used when reusing an unchanged portrait on lower-body-only edits).
function parentBoardImages(character: Character, version: CharacterVersion) {
  if (!version.parentVersionId) return [];
  const parent = character.versions.find((item) => item.id.equals(version.parentVersionId!));
  if (!parent || !isBoardVersion(parent)) return [];
  return [parent.portraitUrl, parent.profileUrl].filter((url): url is string => Boolean(url));
}

// Root v1 board images for an edit: anchor every generation to v1's original portrait and full body
// (falling back to the parent if the root is missing one) so multi-version wardrobe edits never chain-degrade the face.
function rootBoardImages(character: Character, version: CharacterVersion) {
  if (!version.parentVersionId) return [];
  const root = rootVersionOf(character.versions, version);
  const parent = character.versions.find((item) => item.id.equals(version.parentVersionId!));
  const portraitUrl = (isBoardVersion(root) ? root.portraitUrl : undefined) ?? parent?.portraitUrl;
  const profileUrl = (isBoardVersion(root) ? root.profileUrl : undefined) ?? parent?.profileUrl;
  return [portraitUrl, profileUrl].filter((url): url is string => Boolean(url));
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
  const model = imageModelForRealism(isRealisticStyle(style));
  if (isBoardVersion(version)) {
    const photos = characterReferenceUrls(version);
    const immediateParentPortrait = parentBoardImages(character, version)[0];
    // Lower-body-only wardrobe edits (Pants / Shoes) do not touch the head-and-shoulders crop;
    // reuse the parent's portrait so the model never zooms out to show a skirt or shoes.
    if (
      version.editInstruction &&
      immediateParentPortrait &&
      !portraitWardrobeEditText(version.editInstruction)
    ) {
      return {
        requestId: `reuse-portrait-${version.id.toHexString()}`,
        status: "completed",
        model,
        images: [{ url: immediateParentPortrait }],
      };
    }
    const baseImages = rootBoardImages(character, version).slice(0, 1);
    const effectiveEdit = version.editInstruction
      ? cumulativeWardrobeEdit(character.versions, version) || version.editInstruction
      : undefined;
    const submitted = await submitImage({
      model,
      prompt: buildPortraitPrompt({
        style,
        description: version.prompt,
        spec: version.spec,
        photoCount: photos.length,
        editInstruction: effectiveEdit,
        parentImageCount: baseImages.length,
      }),
      aspectRatio: "1:1",
      quality: BOARD_QUALITY,
      resolution: BOARD_RESOLUTION,
      referenceImageUrls: [...baseImages, ...photos],
    });
    return toSent(model, submitted);
  }
  const refs = characterReferenceUrls(version);
  const submitted = await submitImage({
    model,
    prompt: buildBlueprintPrompt({
      style,
      description: version.prompt,
      referenceCount: refs.length,
      editInstruction: version.editInstruction,
    }),
    aspectRatio: "16:9",
    quality: isRealisticStyle(style) ? BOARD_QUALITY : "medium",
    resolution: isRealisticStyle(style) ? BOARD_RESOLUTION : "1k",
    referenceImageUrls: refs,
  });
  return toSent(model, submitted);
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
  const model = imageModelForRealism(isRealisticStyle(style));
  const photos = characterReferenceUrls(version);
  // Edit: anchor to the root v1 full body so multi-version edits keep the original body/pose without generational drift.
  const baseFullBody = version.editInstruction ? rootBoardImages(character, version)[1] : undefined;
  const parentImages = [version.portraitUrl, baseFullBody].filter((url): url is string => Boolean(url));
  const effectiveEdit = version.editInstruction
    ? cumulativeWardrobeEdit(character.versions, version) || version.editInstruction
    : undefined;
  const submitted = await submitImage({
    model,
    prompt: buildFullBodyPrompt({
      style,
      description: version.prompt,
      spec: version.spec,
      photoCount: photos.length,
      editInstruction: effectiveEdit,
      parentImageCount: parentImages.length,
    }),
    aspectRatio: "9:16",
    quality: BOARD_QUALITY,
    resolution: BOARD_RESOLUTION,
    referenceImageUrls: [...parentImages, ...photos],
  });
  return toSent(model, submitted);
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
  const realistic = isRealisticStyle(style);
  const model = imageModelForRealism(realistic);
  const submitted = await submitImage(
    {
      model,
      prompt: buildProfilePrompt({ style, description: version.prompt }),
      aspectRatio: "16:9",
      quality: realistic ? BOARD_QUALITY : "medium",
      resolution: realistic ? BOARD_RESOLUTION : "1k",
      referenceImageUrls: [version.blueprintUrl],
    },
    options,
  );
  return toSent(model, submitted);
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
