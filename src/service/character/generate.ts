import type { ObjectId } from "mongodb";
import { charactersCollection, generationJobsCollection } from "@/dao";
import { submitImage } from "@/service/higgsfield/generate";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { buildBlueprintPrompt, buildProfilePrompt } from "@/service/character/blueprint-prompt";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { versionStyleId } from "@/service/character/character-styles";
import { characterReferenceUrls } from "@/service/character/reference-urls";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import type { Character, CharacterVersion } from "@/model/character";

export const BLUEPRINT_MODEL = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;

// Send one version's sheet to the provider. No job write.
export async function sendCharacterVersion(
  character: Character,
  version: CharacterVersion,
): Promise<Sent> {
  const refs = characterReferenceUrls(version);
  const style = await loadRenderableStyle({
    styleId: versionStyleId(character, version),
    ownerClerkUserId: character.clerkUserId,
  });
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

// Standing preview from the finished sheet. A failure here must not refund the blueprint.
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

// Queue one version's sheet; the queue sends it and marks it failed + refunds on error.
export async function enqueueCharacterVersion(
  character: Character,
  version: CharacterVersion,
) {
  const jobs = await generationJobsCollection();
  // Retry reuses the version id; drop its settled job so the new one is the only one.
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
