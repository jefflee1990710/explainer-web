import { createHash } from "node:crypto";
import { ObjectId, type Filter } from "mongodb";
import { textStylesCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { TextStyleChatMessage, TextStyleDoc, TextStylePreviewStatus } from "@/model/text-style";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { customTextStylePreviewPrompt } from "@/service/director/subtitle-look";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { persistMedia } from "@/service/higgsfield/persist";
import { FRAME_COST } from "@/service/production-plan";
import { resolveTextStyleLookLine } from "@/service/text-style/look-line";

const PREVIEW_IN_FLIGHT_MS = 15 * 60 * 1000;

export type GenerateTextStylePreviewResult =
  | { ok: true; alreadyCurrent?: boolean }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function parseChatCreatedAt(value: unknown): Date | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function textStyleSamplePrompt(lookLine: string) {
  return customTextStylePreviewPrompt(lookLine);
}

export function textStylePreviewHash(lookLine: string) {
  return createHash("sha256").update(textStyleSamplePrompt(lookLine)).digest("hex");
}

export function applyPreviewToTextStyleChat(
  chat: TextStyleChatMessage[] | undefined,
  previewUrl: string,
  chatCreatedAt?: Date,
): TextStyleChatMessage[] {
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

type PreviewFlight = { previewStatus?: TextStylePreviewStatus; previewStartedAt?: Date };

export function textStylePreviewInFlight(doc: PreviewFlight, now: Date): boolean {
  if (doc.previewStatus !== "generating" || !doc.previewStartedAt) return false;
  return now.getTime() - doc.previewStartedAt.getTime() < PREVIEW_IN_FLIGHT_MS;
}

export function textStylePreviewClaimFilter(input: {
  styleId: ObjectId;
  clerkUserId: string;
  now: Date;
}): Filter<TextStyleDoc> {
  const staleAt = new Date(input.now.getTime() - PREVIEW_IN_FLIGHT_MS);
  return {
    _id: input.styleId,
    clerkUserId: input.clerkUserId,
    $or: [
      { previewStatus: { $ne: "generating" as const } },
      { previewStartedAt: { $exists: false } },
      { previewStartedAt: { $lte: staleAt } },
    ],
  } as Filter<TextStyleDoc>;
}

function ownedPreviewFilter(styleId: ObjectId, previewStartedAt: Date) {
  return { _id: styleId, previewStartedAt };
}

async function ownedActiveStyle(id: string, clerkUserId: string) {
  if (!ObjectId.isValid(id)) return null;
  const collection = await textStylesCollection();
  return collection.findOne({ _id: new ObjectId(id), clerkUserId }) as Promise<TextStyleDoc | null>;
}

async function releaseUnqueuedSpend(input: {
  styleId: ObjectId;
  previewStartedAt: Date;
  clerkUserId: string;
  spendKey: string;
}) {
  const collection = await textStylesCollection();
  const reset = await collection.updateOne(ownedPreviewFilter(input.styleId, input.previewStartedAt), {
    $set: {
      previewStatus: "idle",
      previewCreditsCharged: false,
      updatedAt: new Date(),
    },
  });
  if (reset.matchedCount !== 1) return;
  try {
    await refundCredits(input.clerkUserId, FRAME_COST, input.spendKey);
  } catch (error) {
    await collection.updateOne(ownedPreviewFilter(input.styleId, input.previewStartedAt), {
      $set: { previewCreditsCharged: true, updatedAt: new Date() },
    });
    throw error;
  }
}

// Claim the 15-minute slot before charging, then queue one textStylePreview image.
export async function generateTextStylePreviewAction(input: {
  id: string;
  chatCreatedAt?: string;
}): Promise<GenerateTextStylePreviewResult> {
  let spendKey: string | undefined;
  let jobQueued = false;
  let styleId: ObjectId | undefined;
  let previewStartedAt: Date | undefined;
  let clerkUserId = "";

  try {
    const user = await requireAppUser();
    clerkUserId = user.clerkUserId;
    const doc = await ownedActiveStyle(String(input?.id ?? ""), user.clerkUserId);
    if (!doc) return { ok: false, error: "找不到文字樣式" };

    const lookLine = resolveTextStyleLookLine(doc);
    const hash = textStylePreviewHash(lookLine);
    if (doc.imageUrl && doc.previewHash === hash) {
      return { ok: true, alreadyCurrent: true };
    }

    const now = new Date();
    styleId = doc._id;
    previewStartedAt = now;
    const previewChatCreatedAt = parseChatCreatedAt(input.chatCreatedAt);
    const collection = await textStylesCollection();
    const claimed = await collection.updateOne(
      textStylePreviewClaimFilter({
        styleId: doc._id,
        clerkUserId: user.clerkUserId,
        now,
      }),
      {
        $set: {
          previewStatus: "generating",
          previewStartedAt: now,
          lookLine,
          updatedAt: now,
          ...(previewChatCreatedAt ? { previewChatCreatedAt } : {}),
        },
        ...(previewChatCreatedAt ? {} : { $unset: { previewChatCreatedAt: "" } }),
      },
    );
    if (claimed.matchedCount !== 1) return { ok: false, error: "預覽生成中" };

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
    if (charged.matchedCount !== 1) return { ok: false, error: "預覽生成中" };

    let jobId: ObjectId;
    try {
      jobId = await insertPendingJob({
        kind: "textStylePreview",
        textStyleId: doc._id,
        clipIndex: 0,
        model: IMAGE_ROUTE_BY_SCENE_TEXT.en.model,
      });
    } catch (error) {
      await releaseUnqueuedSpend({
        styleId: doc._id,
        previewStartedAt: now,
        clerkUserId: user.clerkUserId,
        spendKey: spendKey!,
      });
      return fail(error, "預覽排隊失敗");
    }
    jobQueued = true;
    kickJob(jobId);
    return { ok: true };
  } catch (error) {
    if (spendKey && !jobQueued && styleId && previewStartedAt) {
      try {
        await releaseUnqueuedSpend({
          styleId,
          previewStartedAt,
          clerkUserId,
          spendKey,
        });
      } catch (refundError) {
        return fail(refundError, "預覽排隊失敗");
      }
    }
    return fail(error, "預覽生成失敗");
  }
}

async function claimPreviewRefund(styleId: ObjectId, clerkUserId: string, previewStartedAt: Date) {
  const styles = await textStylesCollection();
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
  if (claimed.matchedCount !== 1) return;
  try {
    await refundCredits(clerkUserId, FRAME_COST);
  } catch (error) {
    await styles.updateOne(ownedPreviewFilter(styleId, previewStartedAt), {
      $set: { previewCreditsCharged: true, updatedAt: new Date() },
    });
    throw error;
  }
}

function isCurrentPreview(doc: { previewStartedAt?: Date }, job: GenerationJob) {
  if (!doc.previewStartedAt) return true;
  return doc.previewStartedAt.getTime() <= job.createdAt.getTime();
}

// Mirror a textStylePreview job onto the text style. Success replaces imageUrl (the sample IS the style).
export async function syncTextStylePreviewJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
) {
  if (!job.textStyleId) return;
  const styles = await textStylesCollection();
  const doc = (await styles.findOne({ _id: job.textStyleId })) as TextStyleDoc | null;
  if (!doc?.previewStartedAt || !isCurrentPreview(doc, job)) return;
  const startedAt = doc.previewStartedAt;

  if (status === "completed" && outputUrl) {
    const lookLine = resolveTextStyleLookLine(doc);
    const previewHash = textStylePreviewHash(lookLine);
    const stored = await persistMedia(
      outputUrl,
      `explainer/text-styles/${doc._id.toHexString()}/${job._id.toHexString()}`,
    );
    await styles.updateOne(ownedPreviewFilter(doc._id, startedAt), {
      $set: {
        imageUrl: stored,
        previewHash,
        previewStatus: "idle",
        previewCreditsCharged: false,
        chat: applyPreviewToTextStyleChat(doc.chat, stored, doc.previewChatCreatedAt),
        updatedAt: new Date(),
      },
      $unset: { previewChatCreatedAt: "" },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimPreviewRefund(doc._id, doc.clerkUserId, startedAt);
  }
}
