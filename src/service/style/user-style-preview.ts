import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { userStylesCollection } from "@/dao/user-styles";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { PreviewStatus, StyleChatMessage } from "@/model/user-style";
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

function parseChatCreatedAt(value: unknown): Date | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Stamp the new still onto the requesting assistant turn, or the latest one.
export function applyPreviewToChat(
  chat: StyleChatMessage[] | undefined,
  previewUrl: string,
  chatCreatedAt?: Date,
): StyleChatMessage[] {
  const next = (chat ?? []).map((message) => ({ ...message }));
  let index = -1;
  if (chatCreatedAt) {
    index = next.findIndex(
      (message) => message.role === "assistant" && message.createdAt.getTime() === chatCreatedAt.getTime(),
    );
  }
  if (index < 0) {
    for (let i = next.length - 1; i >= 0; i--) {
      if (next[i].role === "assistant") {
        index = i;
        break;
      }
    }
  }
  if (index < 0) return next;
  next[index] = { ...next[index], previewUrl };
  return next;
}

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

// The slot can be claimed when it is not inside the 15-minute generating window.
export function previewSlotAvailable(doc: PreviewFlight, now: Date): boolean {
  return !stylePreviewInFlight(doc, now);
}

type PreviewClaimClause =
  | { previewStatus: { $ne: "generating" } }
  | { previewStartedAt: { $exists: false } }
  | { previewStartedAt: { $lte: Date } };

// Owned, not deleted, and free: status is not generating, the start time is missing, or it is at least 15 minutes old.
export function previewClaimFilter(input: {
  styleId: ObjectId;
  ownerClerkUserId: string;
  now: Date;
}): {
  _id: ObjectId;
  ownerClerkUserId: string;
  deletedAt: { $exists: false };
  $or: PreviewClaimClause[];
} {
  const staleAt = new Date(input.now.getTime() - PREVIEW_IN_FLIGHT_MS);
  return {
    _id: input.styleId,
    ownerClerkUserId: input.ownerClerkUserId,
    deletedAt: { $exists: false },
    $or: [
      { previewStatus: { $ne: "generating" } },
      { previewStartedAt: { $exists: false } },
      { previewStartedAt: { $lte: staleAt } },
    ],
  };
}

// A lost conditional claim must not spend credits.
export function shouldChargeAfterClaim(matchedCount: number): boolean {
  return matchedCount === 1;
}

// Refund an unqueued spend when the reset throws, or when this attempt still owns the slot.
// A reset that matches nothing must not refund a newer preview's charge.
export function shouldRefundUnqueuedSpend(input: {
  spendCaptured: boolean;
  jobQueued: boolean;
  writeThrew: boolean;
  resetMatchedCount: number;
}): boolean {
  if (!input.spendCaptured || input.jobQueued) return false;
  if (input.writeThrew) return true;
  return input.resetMatchedCount === 1;
}

// Later writes name the previewStartedAt this attempt stored, so a newer claim does not match.
export function ownedPreviewFilter(styleId: ObjectId, previewStartedAt: Date) {
  return { _id: styleId, previewStartedAt };
}

// matchedCount 0 means the update did not apply, so previewCreditsCharged stays as it is.
export function shouldClearPreviewCharge(matchedCount: number): boolean {
  return matchedCount === 1;
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

// Clear this attempt's slot and refund once. A thrown reset cannot skip the refund.
async function releaseUnqueuedSpend(input: {
  styleId: ObjectId;
  previewStartedAt: Date;
  ownerClerkUserId: string;
  spendKey: string;
  writeThrew: boolean;
}) {
  const collection = await userStylesCollection();
  let resetThrew = false;
  let resetMatchedCount = 0;
  try {
    const reset = await collection.updateOne(ownedPreviewFilter(input.styleId, input.previewStartedAt), {
      $set: {
        previewStatus: "idle",
        previewCreditsCharged: false,
        updatedAt: new Date(),
      },
    });
    resetMatchedCount = reset.matchedCount;
  } catch {
    resetThrew = true;
  }
  if (
    !shouldRefundUnqueuedSpend({
      spendCaptured: true,
      jobQueued: false,
      writeThrew: input.writeThrew || resetThrew,
      resetMatchedCount,
    })
  ) {
    return;
  }
  try {
    await refundCredits(input.ownerClerkUserId, FRAME_COST, input.spendKey);
  } catch (error) {
    if (resetMatchedCount === 1) {
      await collection.updateOne(ownedPreviewFilter(input.styleId, input.previewStartedAt), {
        $set: { previewCreditsCharged: true, updatedAt: new Date() },
      });
    }
    throw error;
  }
}

// Claim the 15-minute slot before charging, then queue one stylePreview image.
export async function generateUserStylePreviewAction(input: {
  id: string;
  chatCreatedAt?: string;
}): Promise<GenerateUserStylePreviewResult> {
  let spendKey: string | undefined;
  let jobQueued = false;
  let insertFailed = false;
  let styleId: ObjectId | undefined;
  let previewStartedAt: Date | undefined;
  let ownerClerkUserId = "";

  try {
    const user = await requireAppUser();
    ownerClerkUserId = user.clerkUserId;
    const doc = await ownedActiveStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到 Style" };

    const now = new Date();
    styleId = doc._id;
    previewStartedAt = now;
    const previewChatCreatedAt = parseChatCreatedAt(input.chatCreatedAt);
    const collection = await userStylesCollection();
    const claimed = await collection.updateOne(
      previewClaimFilter({
        styleId: doc._id,
        ownerClerkUserId: user.clerkUserId,
        now,
      }),
      {
        $set: {
          previewStatus: "generating",
          previewStartedAt: now,
          updatedAt: now,
          ...(previewChatCreatedAt ? { previewChatCreatedAt } : {}),
        },
        ...(previewChatCreatedAt ? {} : { $unset: { previewChatCreatedAt: "" } }),
      },
    );
    if (!shouldChargeAfterClaim(claimed.matchedCount)) {
      return { ok: false, error: "預覽生成中" };
    }

    try {
      await assertCanSpendCredits(user, FRAME_COST);
      spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    } catch (error) {
      await collection.updateOne(ownedPreviewFilter(doc._id, now), {
        $set: { previewStatus: "idle", updatedAt: new Date() },
      });
      return fail(error, "預覽生成失敗");
    }

    const charged = await collection.updateOne(ownedPreviewFilter(doc._id, now), {
      $set: { previewCreditsCharged: true, updatedAt: new Date() },
    });
    // A newer attempt replaced this start time. Do not refund or overwrite its charge.
    if (!shouldClearPreviewCharge(charged.matchedCount)) {
      return { ok: false, error: "預覽生成中" };
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
      insertFailed = true;
      throw error;
    }
    jobQueued = true;
    kickJob(jobId);

    return { ok: true };
  } catch (error) {
    // A thrown write after consume still refunds once. Insert failure lets the
    // reset result decide, unless that reset itself throws.
    if (spendKey && !jobQueued && styleId && previewStartedAt) {
      try {
        await releaseUnqueuedSpend({
          styleId,
          previewStartedAt,
          ownerClerkUserId,
          spendKey,
          writeThrew: !insertFailed,
        });
      } catch (refundError) {
        return fail(refundError, "預覽排隊失敗");
      }
    }
    return fail(error, "預覽生成失敗");
  }
}

// Claim a charged preview so a failure refunds exactly once, and only for this attempt's start time.
async function claimPreviewRefund(
  styleId: ObjectId,
  ownerClerkUserId: string,
  previewStartedAt: Date,
) {
  const styles = await userStylesCollection();
  const claimed = await styles.updateOne(
    { ...ownedPreviewFilter(styleId, previewStartedAt), previewCreditsCharged: true },
    {
      $set: {
        previewStatus: "failed",
        previewCreditsCharged: false,
        updatedAt: new Date(),
      },
    },
  );
  if (!shouldClearPreviewCharge(claimed.matchedCount)) return;
  try {
    await refundCredits(ownerClerkUserId, FRAME_COST);
  } catch (error) {
    // Restore the claim so a later delivery can retry the refund.
    await styles.updateOne(ownedPreviewFilter(styleId, previewStartedAt), {
      $set: { previewCreditsCharged: true, updatedAt: new Date() },
    });
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
  if (!doc?.previewStartedAt || !isCurrentPreview(doc, job)) return;
  const startedAt = doc.previewStartedAt;

  if (status === "completed" && outputUrl) {
    const prompt = stylePreviewPrompt(renderableFromUserStyle(doc));
    const previewHash = createHash("sha256").update(prompt).digest("hex");
    const stored = await persistMedia(
      outputUrl,
      `explainer/style-previews/${doc._id.toHexString()}/${job._id.toHexString()}`,
    );
    const updated = await styles.updateOne(ownedPreviewFilter(doc._id, startedAt), {
      $set: {
        previewUrl: stored,
        previewFullUrl: stored,
        previewHash,
        previewStatus: "idle",
        previewCreditsCharged: false,
        chat: applyPreviewToChat(doc.chat, stored, doc.previewChatCreatedAt),
        updatedAt: new Date(),
      },
      $unset: { previewChatCreatedAt: "" },
    });
    if (!shouldClearPreviewCharge(updated.matchedCount)) return;
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimPreviewRefund(doc._id, doc.ownerClerkUserId, startedAt);
  }
}
