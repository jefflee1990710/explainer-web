import type { ObjectId } from "mongodb";
import { refundCredits } from "@/lib/billing/credits";
import { charactersCollection } from "@/lib/collections";
import {
  canReframeOnCanvas,
  reframeBlueprintBuffer,
} from "@/lib/characters/blueprint-framing";
import { persistMedia } from "@/lib/higgsfield/persist";
import { resolveStyle } from "@/lib/styles";
import type { GenerationJob, GenerationStatus } from "@/types/generation-job";

// Mark a version failed and refund its credit exactly once. The atomic claim on
// `creditsCharged: true` is the single refund guard; if the refund itself
// throws we restore the flag so a later delivery can retry it.
// `onlyIf` adds extra conditions to the claim (e.g. "still in flight and
// stale") so a concurrent retry cannot be refunded by mistake; `forceStatus:
// false` skips the fallback status write when nothing was claimed.
export async function failCharacterVersion(
  characterId: ObjectId,
  versionId: ObjectId,
  message: string,
  options: { onlyIf?: Record<string, unknown>; forceStatus?: boolean } = {},
): Promise<void> {
  const characters = await charactersCollection();
  const character = await characters.findOne({ _id: characterId, "versions.id": versionId });
  if (!character) return;

  const now = new Date();
  const claimed = await characters.updateOne(
    {
      _id: characterId,
      versions: {
        $elemMatch: { ...options.onlyIf, id: versionId, creditsCharged: true },
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
        { _id: characterId, "versions.id": versionId },
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
  // Nothing claimed: credit already refunded, never charged, or `onlyIf` did
  // not match (e.g. a retry moved the version on). Only record the failure
  // when the caller wants the status forced.
  if (options.forceStatus === false) return;
  await characters.updateOne(
    { _id: characterId, "versions.id": versionId },
    {
      $set: {
        "versions.$.status": "failed",
        "versions.$.error": message,
        updatedAt: now,
      },
    },
  );
}

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
  // Completed sheets are final. A failed version only needs attention when an
  // earlier refund attempt threw and left the charge in place.
  if (version.status === "completed") return;
  if (version.status === "failed") {
    if (version.creditsCharged) {
      // Claim only while still failed so a concurrent retry's fresh charge is
      // never refunded; the version is already failed, so no fallback write.
      await failCharacterVersion(
        job.characterId,
        job.versionId,
        version.error || "藍圖產生失敗",
        { onlyIf: { status: "failed" }, forceStatus: false },
      );
    }
    return;
  }

  const now = new Date();
  const filter = { _id: job.characterId, "versions.id": job.versionId };
  const failVersion = (message: string) =>
    failCharacterVersion(job.characterId!, job.versionId!, message);

  if (status === "completed" && outputUrl) {
    // Reframe only on near-white solid canvases, where the model reliably
    // paints ~255 and the margin guarantee holds. Textured or dark canvases
    // (chalkboard, paper, watercolor) never match their hex within tolerance,
    // so the whole sheet would count as content; trust the prompt's margin
    // rules there and persist the bytes as-is.
    const canvasColor = resolveStyle(character.styleId).canvasColor;
    const transform = canReframeOnCanvas(canvasColor)
      ? (buffer: Buffer) => reframeBlueprintBuffer(buffer, canvasColor)
      : undefined;
    let blueprintUrl: string;
    try {
      blueprintUrl = await persistMedia(
        outputUrl,
        `explainer/characters/${job.characterId.toHexString()}/${job.versionId.toHexString()}`,
        { transform },
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
