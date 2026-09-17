import { refundCredits } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import { persistMedia } from "@/lib/higgsfield/persist";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";

// Mirror a character job's status onto the embedded version before the job
// document is finalized by applyJobStatus.
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
  const failVersion = async (message: string) => {
    const claimed = await characters.updateOne(
      {
        _id: job.characterId,
        versions: {
          $elemMatch: { id: job.versionId, creditsCharged: true },
        },
      },
      {
        $set: {
          "versions.$.status": "failed",
          "versions.$.error": message,
          "versions.$.creditsCharged": false,
          updatedAt: now,
        },
      },
    );
    if (claimed.modifiedCount === 1) {
      try {
        await refundCredits(character.clerkUserId, 1);
      } catch (error) {
        // Restore the claim so a later delivery can retry the refund.
        await characters.updateOne(
          { _id: job.characterId, "versions.id": job.versionId },
          {
            $set: {
              "versions.$.creditsCharged": true,
              updatedAt: new Date(),
            },
          },
        );
        throw error;
      }
      return;
    }
    await characters.updateOne(filter, {
      $set: {
        "versions.$.status": "failed",
        "versions.$.error": message,
        updatedAt: now,
      },
    });
  };

  if (status === "completed" && outputUrl) {
    let blueprintUrl: string;
    try {
      blueprintUrl = await persistMedia(
        outputUrl,
        `explainer/characters/${job.characterId.toHexString()}/${job.versionId.toHexString()}`,
      );
    } catch {
      await failVersion("藍圖保存失敗");
      return;
    }
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
    await failVersion(
      status === "nsfw" ? "內容被判定不適當" : "藍圖產生失敗",
    );
    return;
  }

  if (status === "completed") {
    await failVersion("藍圖產生失敗");
    return;
  }

  if (status === "in_progress" || status === "queued") {
    await characters.updateOne(filter, {
      $set: { "versions.$.status": status, updatedAt: now },
    });
  }
}
