import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  enqueueWorkerTask,
  shouldUseWorkerQueueOnly,
} from "@/service/worker/task-queue";
import { extendJobsCollection } from "@/dao";
import {
  toPublicExtendJob,
  type ExtendJob,
  type PublicExtendJob,
} from "@/model/extend-job";
import type { AspectRatio } from "@/model/project";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { teleportCost } from "@/service/credit-costs";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import {
  comfyRenderStaleMs,
  comfyViewAuthHeaders,
  hasComfyEndpoint,
  isComfyPromptStatusUrl,
  pollVideoProviderStatus,
  submitOpenJutsuExtend,
} from "@/service/comfy/openjutsu-client";
import { deleteExplainerBlobUrls } from "@/util/blob/delete-urls";
import { collectExtendJobTransientBlobUrls } from "@/util/blob/engine-job-blobs";
import { composeJutsuCharacterReferenceSheet } from "@/service/comfy/submit-swap";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  applyJutsuColorGradeBuffer,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-grade";
import { settleTargetClipFromEngineJob } from "@/service/opencut/clip-jutsu-settle";
import { openRouterAuthHeaders } from "@/service/openrouter/generate";

type ExtendJobDoc = ExtendJob & { _id: ObjectId };

export const EXTEND_CLIP_DURATION_SECONDS = 6;

export function shouldUseComfyForExtend(): boolean {
  return hasComfyEndpoint() && process.env.COMFY_EXTEND_ENABLED?.trim() !== "false";
}

async function fetchBufferOrNull(url: string): Promise<Buffer | null> {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((ab) => (ab ? Buffer.from(ab) : null))
    .catch(() => null);
}

function cleanHttpUrls(urls: readonly string[] | undefined, maxCount: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls ?? []) {
    const u = raw?.trim();
    if (!u || !u.startsWith("https://") || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= maxCount) break;
  }
  return out;
}

export async function startExtendJob(input: {
  sourceVideoUrl: string;
  sourceDurationSeconds: number;
  aspectRatio: AspectRatio;
  prompt: string;
  characterImageUrls?: string[];
  sceneImageUrl?: string;
  propImageUrls?: string[];
  posterFrameUrl?: string;
  targetVideoId: string;
  targetClipNumber: number;
}): Promise<{ ok: true; job: PublicExtendJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const prompt = input.prompt.trim().slice(0, 1200);
    if (!prompt) {
      return { ok: false, error: "請輸入延展動作描述" };
    }
    const sourceVideoUrl = input.sourceVideoUrl.trim();
    if (!sourceVideoUrl.startsWith("https://")) {
      return { ok: false, error: "來源影片網址無效" };
    }
    if (!ObjectId.isValid(input.targetVideoId)) {
      return { ok: false, error: "目標專案不存在" };
    }

    const cost = teleportCost({ durationSeconds: EXTEND_CLIP_DURATION_SECONDS });
    await assertCanSpendCredits(user, cost);
    const spendKey = await consumeCredits(user.clerkUserId, cost);

    const now = new Date();
    const jobId = new ObjectId();
    const characterImageUrls = cleanHttpUrls(input.characterImageUrls, 6);
    const sceneImageUrl =
      input.sceneImageUrl?.trim().startsWith("https://")
        ? input.sceneImageUrl.trim()
        : undefined;
    const propImageUrls = cleanHttpUrls(input.propImageUrls, 4);

    const doc: ExtendJobDoc = {
      _id: jobId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      status: "rendering",
      sourceVideoUrl,
      sourceDurationSeconds: Math.max(2, Math.min(15, Math.round(input.sourceDurationSeconds || 6))),
      aspectRatio: input.aspectRatio,
      prompt,
      ...(characterImageUrls.length ? { characterImageUrls } : {}),
      ...(sceneImageUrl ? { sceneImageUrl } : {}),
      ...(propImageUrls.length ? { propImageUrls } : {}),
      ...(input.posterFrameUrl ? { posterFrameUrl: input.posterFrameUrl } : {}),
      applyColorFix: true,
      targetVideoId: new ObjectId(input.targetVideoId),
      targetClipNumber: input.targetClipNumber,
      creditsCharged: cost,
      createdAt: now,
      updatedAt: now,
    };

    const col = await extendJobsCollection();
    try {
      await col.insertOne(doc);
    } catch (err) {
      await refundCredits(user.clerkUserId, cost, spendKey);
      throw err;
    }

    await enqueueWorkerTask({
      kind: "extend",
      targetId: jobId,
      lane: shouldUseComfyForExtend() ? "gpu" : "cpu",
    }).catch(() => {});

    if (!shouldUseWorkerQueueOnly() && !shouldUseComfyForExtend()) {
      after(() =>
        runExtendJobInBackground(jobId).catch((error) => {
          console.error("[extend-video] background job failed", {
            jobId: jobId.toHexString(),
            error,
          });
        }),
      );
    }

    return { ok: true, job: toPublicExtendJob(doc) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "啟動 Extend Video 失敗",
    };
  }
}

export async function runExtendJobInBackground(jobId: ObjectId): Promise<void> {
  const col = await extendJobsCollection();
  const job = (await col.findOne({ _id: jobId })) as ExtendJobDoc | null;
  if (!job || job.status !== "rendering") return;
  if (job.openRouterStatusUrl) return;

  try {
    const videoRes = await fetch(job.sourceVideoUrl);
    if (!videoRes.ok) throw new Error("無法讀取來源分鏡影片");
    const rawVideoBuffer = Buffer.from(await videoRes.arrayBuffer());

    if (!shouldUseComfyForExtend()) {
      throw new Error("ComfyUI 尚未設定");
    }
    const video = await ensureMp4HasAudioStream(rawVideoBuffer);
    const [charBufs, sceneBuf, propBufs] = await Promise.all([
      Promise.all((job.characterImageUrls ?? []).map((u) => fetchBufferOrNull(u))),
      job.sceneImageUrl ? fetchBufferOrNull(job.sceneImageUrl) : Promise.resolve(null),
      Promise.all((job.propImageUrls ?? []).map((u) => fetchBufferOrNull(u))),
    ]);
    const validCharBufs = charBufs.filter((b): b is Buffer => b !== null);
    const validPropBufs = propBufs.filter((b): b is Buffer => b !== null);

    const [characterImage, propImage] = await Promise.all([
      validCharBufs.length > 0
        ? composeJutsuCharacterReferenceSheet(validCharBufs)
        : Promise.resolve(null),
      validPropBufs.length > 0
        ? composeJutsuCharacterReferenceSheet(validPropBufs)
        : Promise.resolve(null),
    ]);

    const submitted = await submitOpenJutsuExtend({
      video,
      clipDurationSeconds: job.sourceDurationSeconds,
      extensionPrompt: job.prompt,
      characterImage,
      sceneImage: sceneBuf,
      propImage,
      aspectRatio: job.aspectRatio,
      seed: 0,
      runId: job._id.toHexString(),
    });

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          openRouterRequestId: submitted.request_id,
          openRouterStatusUrl: submitted.status_url,
          updatedAt: new Date(),
        },
      },
    );

    let rawVideoUrl = submitted.video?.url;
    if (
      !rawVideoUrl &&
      submitted.status_url &&
      !isComfyPromptStatusUrl(submitted.status_url)
    ) {
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((r) => setTimeout(r, 3500));
        let polled;
        try {
          polled = await pollVideoProviderStatus(submitted.status_url);
        } catch {
          break;
        }
        if (polled.status === "completed" && polled.video?.url) {
          rawVideoUrl = polled.video.url;
          break;
        }
        if (polled.status === "failed" || polled.status === "nsfw") {
          throw new Error(polled.error || "延展影片渲染失敗");
        }
      }
    }

    if (rawVideoUrl) {
      const latest = (await col.findOne({ _id: job._id })) as ExtendJobDoc | null;
      await finalizeExtendRenderedVideo(latest ?? job, rawVideoUrl);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Extend Video 渲染失敗";
    await failExtendJobAndRefund(job, msg);
  }
}

async function failExtendJobAndRefund(job: ExtendJobDoc, error: string): Promise<Date> {
  const col = await extendJobsCollection();
  const now = new Date();
  const updateRes = await col.updateOne(
    { _id: job._id, status: { $ne: "failed" } },
    {
      $set: {
        status: "failed",
        error,
        creditsRefunded: true,
        updatedAt: now,
      },
    },
  );
  if (
    updateRes.modifiedCount > 0 &&
    !job.creditsRefunded &&
    job.creditsCharged &&
    job.creditsCharged > 0
  ) {
    await refundCredits(job.clerkUserId, job.creditsCharged).catch((err) => {
      console.error("[extend-video] credit refund failed", {
        jobId: job._id.toHexString(),
        err,
      });
    });
  }
  await settleTargetClipFromEngineJob({
    targetVideoId: job.targetVideoId,
    targetClipNumber: job.targetClipNumber,
    status: "failed",
    error,
  });
  void deleteExplainerBlobUrls(collectExtendJobTransientBlobUrls(job)).catch(() => {});
  return now;
}

async function finalizeExtendRenderedVideo(
  job: ExtendJobDoc,
  rawVideoUrl: string,
): Promise<{ ok: true; job: PublicExtendJob }> {
  const headers = {
    ...openRouterAuthHeaders(rawVideoUrl),
    ...comfyViewAuthHeaders(rawVideoUrl),
  };
  const res = await fetch(rawVideoUrl, Object.keys(headers).length ? { headers } : undefined);
  if (!res.ok) {
    throw new Error(`無法下載延展影片（HTTP ${res.status}）`);
  }
  let videoBuf: Buffer = Buffer.from(await res.arrayBuffer());

  if (job.applyColorFix !== false) {
    const ungraded = videoBuf;
    videoBuf = Buffer.from(
      await applyJutsuColorGradeBuffer(ungraded, DEFAULT_JUTSU_COLOR_SETTINGS).catch(
        () => ungraded,
      ),
    );
  }

  const prefix = `explainer/extend/${job.userId.toHexString()}/${job._id.toHexString()}`;
  const outputVideoUrl = await persistBuffer(videoBuf, `${prefix}/output.mp4`, "video/mp4");

  const now = new Date();
  const col = await extendJobsCollection();
  await col.updateOne(
    { _id: job._id },
    { $set: { status: "completed", outputVideoUrl, error: undefined, updatedAt: now } },
  );

  await settleTargetClipFromEngineJob({
    targetVideoId: job.targetVideoId,
    targetClipNumber: job.targetClipNumber,
    status: "completed",
    outputVideoUrl,
  });
  void deleteExplainerBlobUrls(collectExtendJobTransientBlobUrls(job)).catch(() => {});

  try {
    revalidatePath("/app");
  } catch {
    // Non-request context
  }

  return {
    ok: true,
    job: toPublicExtendJob({
      ...job,
      status: "completed",
      outputVideoUrl,
      error: undefined,
      updatedAt: now,
    }),
  };
}

export async function advanceExtendJobs(clerkUserId?: string): Promise<number> {
  const col = await extendJobsCollection();
  const filter: Record<string, unknown> = { status: "rendering" };
  if (clerkUserId) filter.clerkUserId = clerkUserId;
  const active = (await col
    .find(filter)
    .sort({ updatedAt: 1 })
    .limit(50)
    .toArray()) as ExtendJobDoc[];

  const nowMs = Date.now();
  const stuckPrepCutoff = nowMs - 3 * 60 * 1000;

  const outcomes = await Promise.allSettled(
    active.map(async (job): Promise<number> => {
      try {
        if (!job.openRouterStatusUrl) {
          if (job.createdAt.getTime() < nowMs - 25 * 60 * 1000) {
            await failExtendJobAndRefund(job, "Extend Video 處理逾時，請重試");
            return 1;
          }
          if (job.updatedAt.getTime() < stuckPrepCutoff) {
            await runExtendJobInBackground(job._id);
            return 1;
          }
          return 0;
        }

        const staleMs = comfyRenderStaleMs(job.openRouterStatusUrl);
        if (job.createdAt.getTime() < nowMs - staleMs) {
          await failExtendJobAndRefund(job, "Extend Video 渲染逾時，請重試");
          return 1;
        }

        const polled = await pollVideoProviderStatus(job.openRouterStatusUrl);
        if (polled.status === "completed" && polled.video?.url) {
          await finalizeExtendRenderedVideo(job, polled.video.url);
          return 1;
        }
        if (polled.status === "failed" || polled.status === "nsfw") {
          await failExtendJobAndRefund(job, polled.error || "延展影片渲染失敗");
          return 1;
        }
      } catch (err) {
        console.error("[extend-video] advance failed", {
          jobId: job._id.toHexString(),
          err,
        });
      }
      return 0;
    }),
  );

  return outcomes.reduce(
    (sum, item) => sum + (item.status === "fulfilled" ? item.value : 0),
    0,
  );
}
