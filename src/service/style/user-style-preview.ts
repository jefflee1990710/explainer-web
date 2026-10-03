import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { userStylesCollection } from "@/dao/user-styles";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { PreviewStatus } from "@/model/user-style";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { persistMedia } from "@/service/higgsfield/persist";
import { LETTERING_KEYS, resolveStyleLettering } from "@/service/style/lettering";
import { STYLE_PREVIEW_SCENE } from "@/service/style/preview-scene";
import { styleLetteringLine, styleLinesForFrame } from "@/service/style/prompts";
import { renderableFromUserStyle, type RenderableStyle } from "@/service/style/renderable-style";
import { FRAME_COST } from "@/service/production-plan";

// A generating preview older than this is no longer treated as in flight.
const PREVIEW_IN_FLIGHT_MS = 15 * 60 * 1000;

export type GenerateUserStylePreviewResult = { ok: true } | { ok: false; error: string };

type PreviewFlight = { previewStatus: PreviewStatus; previewStartedAt?: Date };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

// Saved look, shared IDEA scene, lettering, and a fixed 16:9 frame.
export function stylePreviewPrompt(style: RenderableStyle): string {
  const lettering = resolveStyleLettering(style);
  const letteringLines = LETTERING_KEYS.map((key) => lettering[key]).filter((line) => line.length > 0);
  return [
    ...styleLinesForFrame(style),
    STYLE_PREVIEW_SCENE,
    styleLetteringLine(style),
    ...letteringLines,
    "The label must read exactly IDEA.",
    "Aspect ratio 16:9.",
  ].join("\n");
}

// True only while a preview is generating and started less than 15 minutes ago.
export function stylePreviewInFlight(doc: PreviewFlight, now: Date): boolean {
  if (doc.previewStatus !== "generating" || !doc.previewStartedAt) return false;
  return now.getTime() - doc.previewStartedAt.getTime() < PREVIEW_IN_FLIGHT_MS;
}

// Active custom style owned by this user. Deleted rows are not previewable from the action.
async function ownedActiveStyle(id: string, clerkUserId: string) {
  if (!ObjectId.isValid(id)) return null;
  const collection = await userStylesCollection();
  return collection.findOne({
    _id: new ObjectId(id),
    ownerClerkUserId: clerkUserId,
    deletedAt: { $exists: false },
  });
}

// Charge four credits and queue one stylePreview image. Insert failure refunds once.
export async function generateUserStylePreviewAction(input: {
  id: string;
}): Promise<GenerateUserStylePreviewResult> {
  try {
    const user = await requireAppUser();
    const doc = await ownedActiveStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到 Style" };
    if (stylePreviewInFlight(doc, new Date())) return { ok: false, error: "預覽生成中" };

    await assertCanSpendCredits(user, FRAME_COST);
    const spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    const now = new Date();
    const collection = await userStylesCollection();
    const marked = await collection.updateOne(
      { _id: doc._id, ownerClerkUserId: user.clerkUserId, deletedAt: { $exists: false } },
      {
        $set: {
          previewStatus: "generating",
          previewStartedAt: now,
          previewCreditsCharged: true,
          updatedAt: now,
        },
      },
    );
    if (marked.matchedCount !== 1) {
      await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      return { ok: false, error: "找不到 Style" };
    }

    let jobId: ObjectId;
    try {
      jobId = await insertPendingJob({
        kind: "stylePreview",
        userStyleId: doc._id,
        clipIndex: 0,
        model: IMAGE_ROUTE_BY_SCENE_TEXT.en.model,
      });
    } catch (error) {
      // Drop the charge flag before refunding so a later failure cannot refund again.
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            previewStatus: "idle",
            previewCreditsCharged: false,
            updatedAt: new Date(),
          },
        },
      );
      try {
        await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      } catch (refundError) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { previewCreditsCharged: true, updatedAt: new Date() } },
        );
        return fail(refundError, "預覽排隊失敗");
      }
      return fail(error, "預覽排隊失敗");
    }
    kickJob(jobId);

    return { ok: true };
  } catch (error) {
    return fail(error, "預覽生成失敗");
  }
}

// Claim a charged preview so a failure refunds exactly once.
async function claimPreviewRefund(styleId: ObjectId, ownerClerkUserId: string) {
  const styles = await userStylesCollection();
  const claimed = await styles.updateOne(
    { _id: styleId, previewCreditsCharged: true },
    {
      $set: {
        previewStatus: "failed",
        previewCreditsCharged: false,
        updatedAt: new Date(),
      },
    },
  );
  if (claimed.matchedCount === 0) return;
  try {
    await refundCredits(ownerClerkUserId, FRAME_COST);
  } catch (error) {
    // Restore the claim so a later delivery can retry the refund.
    await styles.updateOne(
      { _id: styleId },
      { $set: { previewCreditsCharged: true, updatedAt: new Date() } },
    );
    throw error;
  }
}

// previewStartedAt is written just before the job insert, so a later preview is newer than this job.
function isCurrentPreview(doc: { previewStartedAt?: Date }, job: GenerationJob) {
  if (!doc.previewStartedAt) return true;
  return doc.previewStartedAt.getTime() <= job.createdAt.getTime();
}

// Mirror a stylePreview job onto the user style. Soft-deleted rows still store a finished image.
export async function syncStylePreviewJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (!job.userStyleId) return;
  const styles = await userStylesCollection();
  const doc = await styles.findOne({ _id: job.userStyleId });
  if (!doc) return;
  // A newer preview owns the charge flag. This job must not refund it or overwrite its image.
  if (!isCurrentPreview(doc, job)) return;

  if (status === "completed" && outputUrl) {
    const prompt = stylePreviewPrompt(renderableFromUserStyle(doc));
    const previewHash = createHash("sha256").update(prompt).digest("hex");
    const stored = await persistMedia(
      outputUrl,
      `explainer/style-previews/${doc._id.toHexString()}`,
    );
    await styles.updateOne(
      { _id: doc._id },
      {
        $set: {
          previewUrl: stored,
          previewFullUrl: stored,
          previewHash,
          previewStatus: "idle",
          previewCreditsCharged: false,
          updatedAt: new Date(),
        },
      },
    );
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimPreviewRefund(doc._id, doc.ownerClerkUserId);
  }
}
