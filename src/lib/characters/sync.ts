import { refundCredits } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { persistMedia } from "@/lib/higgsfield/persist";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";

// Mirror a character job's status onto the embedded version. Called from
// applyJobStatus after the job document itself has been updated.
export async function syncCharacterJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (!job.characterId || !job.versionId) return;
  const characters = await charactersCollection();
  const character = await characters.findOne({
    _id: job.characterId,
    "versions.id": job.versionId,
  });
  if (!character) return;
  const version = character.versions.find((item) => item.id.equals(job.versionId!));
  if (!version) return;

  const now = new Date();
  const filter = { _id: job.characterId, "versions.id": job.versionId };

  if (status === "completed" && outputUrl) {
    const blueprintUrl = await persistMedia(
      outputUrl,
      `explainer/characters/${job.characterId.toHexString()}/${job.versionId.toHexString()}`,
    );
    await characters.updateOne(filter, {
      $set: {
        "versions.$.status": "completed",
        "versions.$.blueprintUrl": blueprintUrl,
        "versions.$.error": undefined,
        updatedAt: now,
        // First finished sheet becomes the default automatically.
        ...(character.defaultVersionId ? {} : { defaultVersionId: job.versionId }),
      },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    const alreadyFailed = version.status === "failed";
    await characters.updateOne(filter, {
      $set: {
        "versions.$.status": "failed",
        "versions.$.error": status === "nsfw" ? "內容被判定不適當" : "藍圖產生失敗",
        "versions.$.creditsCharged": false,
        updatedAt: now,
      },
    });
    if (!alreadyFailed && version.creditsCharged) {
      await refundCredits(character.clerkUserId, 1);
    }
    return;
  }

  if (status === "in_progress" || status === "queued") {
    await characters.updateOne(filter, {
      $set: { "versions.$.status": status, updatedAt: now },
    });
  }
}
