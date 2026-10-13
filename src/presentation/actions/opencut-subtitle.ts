"use server";

import { ObjectId } from "mongodb";
import { videosCollection } from "@/dao";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { enqueueSubtitlePlateJobs } from "@/service/higgsfield/subtitle-plate-job";
import {
  classifyOpencutSubtitlePlates,
  opencutSubtitleStyleChanged,
} from "@/service/opencut/subtitle-plates";
import { updateVideoTextStyleAction } from "@/service/project/actions";
import { isProductionLike } from "@/service/project-status";

export type OpencutSubtitlePlateRow = { clipNumber: number; url: string };

export async function syncOpencutSubtitlePlatesAction(input: {
  videoId: string;
  textStyleId: string;
  clipNumbers: number[];
}): Promise<
  | {
      ok: true;
      plates: OpencutSubtitlePlateRow[];
      pending: number[];
      failed: Array<{ clipNumber: number; error: string }>;
    }
  | { ok: false; error: string }
> {
  try {
    const user = await requireAppUser();
    const { videoId, textStyleId, clipNumbers } = input;
    if (!ObjectId.isValid(videoId) || clipNumbers.length === 0) {
      return { ok: false, error: "專案不存在" };
    }
    const unique = [...new Set(clipNumbers)].filter((n) => Number.isInteger(n) && n > 0);
    if (unique.length === 0) return { ok: false, error: "沒有可產生的片段" };

    const projects = await videosCollection();
    const before = await projects.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!before?.phaseA) return { ok: false, error: "專案不存在" };
    if (!isProductionLike(before.status)) {
      return { ok: false, error: "分鏡尚未完成" };
    }

    const styleResult = await updateVideoTextStyleAction(videoId, textStyleId);
    if (!styleResult.ok) return styleResult;

    const project = await projects.findOne({ _id: before._id });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };

    const styleChanged = opencutSubtitleStyleChanged(before, {
      textStyleId,
      textStyleImageUrl: styleResult.project.textStyleImageUrl,
    });

    const classified = classifyOpencutSubtitlePlates({
      clips: project.phaseA.clips,
      plates: project.subtitlePlates,
      clipNumbers: unique,
      styleChanged,
    });

    if (classified.toEnqueue.length > 0) {
      const cost = classified.toEnqueue.length * FRAME_COST;
      await assertCanSpendCredits(user, cost);
      const spendKey = await consumeCredits(user.clerkUserId, cost);
      try {
        await enqueueSubtitlePlateJobs(project, classified.toEnqueue, { skipOverlayCheck: true });
      } catch (error) {
        await refundCredits(user.clerkUserId, cost, spendKey);
        throw error;
      }
    }

    const fresh = await projects.findOne({ _id: project._id });
    const after = classifyOpencutSubtitlePlates({
      clips: fresh!.phaseA!.clips,
      plates: fresh!.subtitlePlates,
      clipNumbers: unique,
      styleChanged: false,
    });

    return {
      ok: true,
      plates: after.ready,
      pending: after.pending,
      failed: after.failed,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生字幕圖失敗",
    };
  }
}
