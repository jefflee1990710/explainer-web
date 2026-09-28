import { generationJobsCollection } from "@/dao";
import { submitImage } from "@/service/higgsfield/generate";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { persistImmediateSubmit } from "@/service/higgsfield/pipeline";
import { buildBlueprintPrompt } from "@/service/character/blueprint-prompt";
import { toSent, type Sent } from "@/service/generation/sent";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import type { Character, CharacterVersion } from "@/model/character";
import type { GenerationStatus } from "@/model/generation-job";

export const BLUEPRINT_MODEL = IMAGE_ROUTE_BY_SCENE_TEXT.en.model;

// Send one version's sheet to the provider. No job write.
export async function sendCharacterVersion(
  character: Character,
  version: CharacterVersion,
): Promise<Sent> {
  const submitted = await submitImage({
    model: BLUEPRINT_MODEL,
    prompt: buildBlueprintPrompt({
      styleId: character.styleId,
      description: version.prompt,
      hasReference: Boolean(version.referenceImageUrl),
      editInstruction: version.editInstruction,
    }),
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
    referenceImageUrls: [version.referenceImageUrl],
  });
  return toSent(BLUEPRINT_MODEL, submitted);
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

// Submit one version's sheet and record the job. Throws if the
// provider rejects the request; the caller marks the version failed + refunds.
export async function submitCharacterVersion(
  character: Character,
  version: CharacterVersion,
) {
  const sent = await sendCharacterVersion(character, version);

  const jobs = await generationJobsCollection();
  await jobs.insertOne({
    characterId: character._id,
    versionId: version.id,
    clipIndex: -1,
    kind: "character",
    model: sent.model,
    requestId: sent.requestId,
    statusUrl: sent.statusUrl,
    status: (sent.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await persistImmediateSubmit(sent);
}
