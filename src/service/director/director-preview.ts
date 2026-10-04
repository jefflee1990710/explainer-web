import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { userDirectorsCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { DirectorChatMessage, DirectorPreviewStatus, Skill } from "@/model/skill";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { bleedDirectorPreview } from "@/service/director/preview-frame";
import {
  DIRECTOR_PREVIEW_STRIP_IDS,
  directorPreviewFields,
  directorPreviewPrompt,
  directorPreviewSource,
  directorPreviewStyleNames,
} from "@/service/director/preview-prompt";
import { emptyProfile } from "@/service/director/profile";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { persistBuffer } from "@/service/higgsfield/persist";
import { FRAME_COST } from "@/service/production-plan";
import { hydrateStyles, resolvedStyle } from "@/service/style/load-style";
import {
  shouldChargeAfterClaim,
  shouldClearPreviewCharge,
  shouldRefundUnqueuedSpend,
} from "@/service/style/user-style-preview";

// A generating preview older than this is no longer treated as in flight.
const PREVIEW_IN_FLIGHT_MS = 15 * 60 * 1000;

export type GenerateDirectorPreviewResult =
  | { ok: true; alreadyCurrent?: boolean }
  | { ok: false; error: string };

function parseChatCreatedAt(value: unknown): Date | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Stamp the new still onto the requesting assistant turn, or the latest one.
export function applyDirectorPreviewToChat(
  chat: DirectorChatMessage[] | undefined,
  previewUrl: string,
  chatCreatedAt?: Date,
): DirectorChatMessage[] {
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

// Fingerprint of the director text the still was painted from.
export function directorPreviewHash(fields: { title: string; visual: string; plan: string }) {
  return createHash("sha256").update(directorPreviewSource(fields)).digest("hex");
}

function fieldsFromSkill(skill: Pick<Skill, "title" | "description" | "customProfile">) {
  const profile = skill.customProfile ?? emptyProfile();
  return directorPreviewFields({
    title: skill.title,
    description: skill.description,
    visual: profile.visual,
    hook: profile.hook,
    arc: profile.arc,
  });
}

type PreviewFlight = { previewStatus?: DirectorPreviewStatus; previewStartedAt?: Date };

export function directorPreviewInFlight(doc: PreviewFlight, now: Date): boolean {
  if (doc.previewStatus !== "generating" || !doc.previewStartedAt) return false;
  return now.getTime() - doc.previewStartedAt.getTime() < PREVIEW_IN_FLIGHT_MS;
}

type PreviewClaimClause =
  | { previewStatus: { $ne: "generating" } }
  | { previewStartedAt: { $exists: false } }
  | { previewStartedAt: { $lte: Date } };

// Owned, still active, and free: not generating, or the start time is missing or at least 15 minutes old.
export function directorPreviewClaimFilter(input: {
  directorId: ObjectId;
  ownerClerkUserId: string;
  now: Date;
}): {
  _id: ObjectId;
  ownerClerkUserId: string;
  isActive: true;
  $or: PreviewClaimClause[];
} {
  const staleAt = new Date(input.now.getTime() - PREVIEW_IN_FLIGHT_MS);
  return {
    _id: input.directorId,
    ownerClerkUserId: input.ownerClerkUserId,
    isActive: true,
    $or: [
      { previewStatus: { $ne: "generating" } },
      { previewStartedAt: { $exists: false } },
      { previewStartedAt: { $lte: staleAt } },
    ],
  };
}

function ownedPreviewFilter(directorId: ObjectId, previewStartedAt: Date) {
  return { _id: directorId, previewStartedAt };
}

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function ownedActiveDirector(id: string, clerkUserId: string) {
  if (!ObjectId.isValid(id)) return null;
  const collection = await userDirectorsCollection();
  return collection.findOne({
    _id: new ObjectId(id),
    ownerClerkUserId: clerkUserId,
    isActive: true,
  });
}

// Clear this attempt's slot and refund once. A thrown reset cannot skip the refund.
async function releaseUnqueuedSpend(input: {
  directorId: ObjectId;
  previewStartedAt: Date;
  ownerClerkUserId: string;
  spendKey: string;
  writeThrew: boolean;
}) {
  const collection = await userDirectorsCollection();
  let resetThrew = false;
  let resetMatchedCount = 0;
  try {
    const reset = await collection.updateOne(ownedPreviewFilter(input.directorId, input.previewStartedAt), {
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
      await collection.updateOne(ownedPreviewFilter(input.directorId, input.previewStartedAt), {
        $set: { previewCreditsCharged: true, updatedAt: new Date() },
      });
    }
    throw error;
  }
}

// Claim the 15-minute slot before charging, then queue one directorPreview image.
export async function generateDirectorPreviewAction(input: {
  id: string;
  chatCreatedAt?: string;
}): Promise<GenerateDirectorPreviewResult> {
  let spendKey: string | undefined;
  let jobQueued = false;
  let insertFailed = false;
  let directorId: ObjectId | undefined;
  let previewStartedAt: Date | undefined;
  let ownerClerkUserId = "";

  try {
    const user = await requireAppUser();
    ownerClerkUserId = user.clerkUserId;
    const doc = await ownedActiveDirector(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到 Director" };
    const fields = fieldsFromSkill(doc);
    // The still already matches the saved profile. Do not charge again.
    if (doc.previewUrl && doc.previewHash === directorPreviewHash(fields)) {
      return { ok: true, alreadyCurrent: true };
    }

    const now = new Date();
    directorId = doc._id;
    previewStartedAt = now;
    const previewChatCreatedAt = parseChatCreatedAt(input.chatCreatedAt);
    const collection = await userDirectorsCollection();
    const claimed = await collection.updateOne(
      directorPreviewClaimFilter({
        directorId: doc._id,
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
    if (!shouldClearPreviewCharge(charged.matchedCount)) {
      return { ok: false, error: "預覽生成中" };
    }

    let jobId: ObjectId;
    try {
      jobId = await insertPendingJob({
        kind: "directorPreview",
        skillId: doc._id,
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
    if (spendKey && !jobQueued && directorId && previewStartedAt) {
      try {
        await releaseUnqueuedSpend({
          directorId,
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

async function claimPreviewRefund(
  directorId: ObjectId,
  ownerClerkUserId: string,
  previewStartedAt: Date,
) {
  const directors = await userDirectorsCollection();
  const claimed = await directors.updateOne(
    { ...ownedPreviewFilter(directorId, previewStartedAt), previewCreditsCharged: true },
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
    await directors.updateOne(ownedPreviewFilter(directorId, previewStartedAt), {
      $set: { previewCreditsCharged: true, updatedAt: new Date() },
    });
    throw error;
  }
}

function isCurrentPreview(doc: { previewStartedAt?: Date }, job: GenerationJob) {
  if (!doc.previewStartedAt) return true;
  return doc.previewStartedAt.getTime() <= job.createdAt.getTime();
}

// Mirror a directorPreview job onto the custom director, including a soft-deleted row.
export async function syncDirectorPreviewJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (!job.skillId) return;
  const directors = await userDirectorsCollection();
  const doc = await directors.findOne({ _id: job.skillId });
  if (!doc?.previewStartedAt || !isCurrentPreview(doc, job)) return;
  const startedAt = doc.previewStartedAt;
  const ownerClerkUserId = doc.ownerClerkUserId;
  if (!ownerClerkUserId) return;

  if (status === "completed" && outputUrl) {
    const fields = fieldsFromSkill(doc);
    const previewHash = directorPreviewHash(fields);
    const response = await fetch(outputUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`無法下載導演預覽（${response.status}）`);
    const webp = await bleedDirectorPreview(Buffer.from(await response.arrayBuffer()));
    const stored = await persistBuffer(
      webp,
      `explainer/directors/${doc._id.toHexString()}-preview-${previewHash.slice(0, 10)}.webp`,
      "image/webp",
    );
    await directors.updateOne(ownedPreviewFilter(doc._id, startedAt), {
      $set: {
        previewUrl: stored,
        previewHash,
        previewStatus: "idle",
        previewCreditsCharged: false,
        chat: applyDirectorPreviewToChat(doc.chat, stored, doc.previewChatCreatedAt),
        updatedAt: new Date(),
      },
      $unset: { previewChatCreatedAt: "" },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimPreviewRefund(doc._id, ownerClerkUserId, startedAt);
  }
}

// Build the 5-frame strip prompt from the saved custom profile.
export async function directorPreviewImagePrompt(skill: Pick<Skill, "title" | "description" | "customProfile">) {
  await hydrateStyles();
  const styleNames = directorPreviewStyleNames(
    DIRECTOR_PREVIEW_STRIP_IDS.map((id) => {
      const style = resolvedStyle(id);
      return { id: style.id, name: style.name };
    }),
  );
  const fields = fieldsFromSkill(skill);
  return directorPreviewPrompt({ ...fields, styleNames });
}
