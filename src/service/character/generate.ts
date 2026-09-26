import { generationJobsCollection } from "@/dao";
import { mediaUrlFromResponse } from "@/service/higgsfield/client";
import { submitImage } from "@/service/higgsfield/generate";
import { OPENROUTER_IMAGE_MODEL } from "@/service/openrouter/generate";
import { applyJobStatus } from "@/service/higgsfield/pipeline";
import { buildBlueprintPrompt } from "@/service/character/blueprint-prompt";
import type { Character, CharacterVersion } from "@/model/character";
import type { GenerationStatus } from "@/model/generation-job";

export const BLUEPRINT_MODEL = OPENROUTER_IMAGE_MODEL;

// Submit one version's sheet and record the job. Throws if the
// provider rejects the request; the caller marks the version failed + refunds.
export async function submitCharacterVersion(
  character: Character,
  version: CharacterVersion,
) {
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

  const jobs = await generationJobsCollection();
  await jobs.insertOne({
    characterId: character._id,
    versionId: version.id,
    clipIndex: -1,
    kind: "character",
    model: BLUEPRINT_MODEL,
    requestId: submitted.request_id,
    statusUrl: submitted.status_url,
    status: (submitted.status as GenerationStatus) || "queued",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const outputUrl = mediaUrlFromResponse(submitted);
  if (submitted.status === "completed" && outputUrl) {
    await applyJobStatus({
      requestId: submitted.request_id,
      status: "completed",
      outputUrl,
    });
  }
}
