import { generationJobsCollection } from "@/lib/collections";
import { mediaUrlFromResponse } from "@/lib/higgsfield/client";
import { QWEN_IMAGE_MODEL, submitImage } from "@/lib/higgsfield/generate";
import { applyJobStatus } from "@/lib/higgsfield/pipeline";
import { buildBlueprintPrompt } from "@/lib/characters/blueprint-prompt";
import type { Character, CharacterVersion } from "@/types/character";
import type { GenerationStatus } from "@/types/generation-job";

export const BLUEPRINT_MODEL = QWEN_IMAGE_MODEL;

// Submit one version's sheet to Higgsfield and record the job. Throws if the
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
