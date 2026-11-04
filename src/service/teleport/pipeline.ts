import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { teleportJobsCollection } from "@/dao";
import {
  toPublicTeleportJob,
  type PublicTeleportJob,
  type TeleportJob,
} from "@/model/teleport-job";
import type { AspectRatio } from "@/model/project";
import { requireAppUser } from "@/service/auth";
import { persistBuffer } from "@/service/higgsfield/persist";
import { settleTargetClipFromEngineJob } from "@/service/opencut/clip-jutsu-settle";
import {
  createStandaloneEngineProject,
  deleteStandaloneEngineProjectIfOwned,
  syncStandaloneEngineFrame,
} from "@/service/opencut/standalone-engine-video";
import {
  applyJutsuColorGradeBuffer,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-grade";
import {
  describeJutsuVideoMotion,
  upsampleJutsuFramePrompt,
} from "@/service/jutsu/describer";
import {
  hasMinimaxApiKey,
  submitMinimaxH3Ref2VaVideo,
} from "@/service/jutsu/minimax-h3-ref2va";
import {
  extractVideoSectionAudioMp3,
  extractVideoSectionKeyframes,
  muxSourceSectionAudio,
} from "@/service/jutsu/pipeline";
import { buildSam3MannequinAndMaskVideos } from "@/service/jutsu/sam-mannequin";
import {
  comfyRenderStaleMs,
  comfyViewAuthHeaders,
  pollVideoProviderStatus,
} from "@/service/comfy/openjutsu-client";
import { trySubmitTeleportComfy } from "@/service/comfy/submit-swap";
import {
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  openRouterAuthHeaders,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { cutSubjectOntoPlain } from "@/service/teleport/identity-frame";
import {
  buildTeleportRelocatePrompt,
  buildTeleportScenePlatePrompt,
  buildTeleportVideoPrompt,
  chooseTeleportVideoEngine,
} from "@/service/teleport/prompts";
import {
  isAllowedTeleportMediaUrl,
  normalizeTeleportStart,
  teleportSubmitDurationSeconds,
  type TeleportStartInput,
} from "@/service/teleport/start-input";
import { blobStoreHost } from "@/service/video-edit/edit-state";

type TeleportJobDoc = TeleportJob & { _id: ObjectId };

/** Seedream 5.0 Pro 2K still, re-encoded to WebP. */
async function seedreamWebp(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImageUrls?: string[];
}): Promise<Buffer> {
  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    referenceImageUrls: input.referenceImageUrls,
  });
  const url = res.images?.[0]?.url;
  if (!url) throw new Error("OpenRouter Seedream 5.0 Pro 未回傳圖片");
  const raw = url.startsWith("data:")
    ? Buffer.from(url.split(",")[1] || "", "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  return sharp(raw).webp({ quality: 88 }).toBuffer();
}

/** Download a URL into a Buffer, or null when it cannot be read. */
async function fetchBufferOrNull(url: string): Promise<Buffer | null> {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((ab) => (ab ? Buffer.from(ab) : null))
    .catch(() => null);
}

function safeRevalidate() {
  try {
    revalidatePath("/app/teleport");
  } catch {
    // Non-request background / cron context
  }
}

/** Poll cloud MiniMax / OpenRouter, or the self-hosted OpenJutsu prompt. */
function pollStatusOnce(statusUrl: string) {
  return pollVideoProviderStatus(statusUrl);
}

/** Create a `rendering` Teleport job and run the pipeline in `after()`. */
export async function startTeleportJob(
  input: TeleportStartInput,
): Promise<{ ok: true; job: PublicTeleportJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const normalized = normalizeTeleportStart(input);
    if (!normalized.ok) return normalized;

    const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
    if (!isAllowedTeleportMediaUrl(normalized.sourceVideoUrl, user.clerkUserId, storeHost)) {
      return {
        ok: false,
        error: normalized.sourceVideoUrl.trim().startsWith("https://")
          ? "來源影片網址無效"
          : "請先上傳來源影片",
      };
    }
    if (
      normalized.sceneImageUrl &&
      !isAllowedTeleportMediaUrl(normalized.sceneImageUrl, user.clerkUserId, storeHost)
    ) {
      return { ok: false, error: "場景照網址無效" };
    }

    const now = new Date();
    const jobId = new ObjectId();
    let resolvedTargetVideoId =
      normalized.targetVideoId && ObjectId.isValid(normalized.targetVideoId)
        ? new ObjectId(normalized.targetVideoId)
        : undefined;
    let resolvedTargetClipNumber = normalized.targetClipNumber;
    if (!resolvedTargetVideoId) {
      resolvedTargetVideoId = await createStandaloneEngineProject({
        userId: user._id,
        clerkUserId: user.clerkUserId,
        kind: "teleport",
        title: normalized.scenePrompt
          ? `Teleport · ${normalized.scenePrompt.slice(0, 48)}`
          : "Teleport",
        sourceVideoUrl: normalized.sourceVideoUrl,
        aspectRatio: normalized.aspectRatio,
        durationSeconds: normalized.sectionLength,
        status: "rendering",
        now,
      });
      resolvedTargetClipNumber = 1;
    }

    const doc: TeleportJobDoc = {
      _id: jobId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      status: "rendering",
      sourceVideoUrl: normalized.sourceVideoUrl,
      aspectRatio: normalized.aspectRatio,
      sectionStart: normalized.sectionStart,
      sectionLength: normalized.sectionLength,
      sceneImageUrl: normalized.sceneImageUrl,
      scenePrompt: normalized.scenePrompt,
      scenePlateGenerated: false,
      keepSourceAudio: normalized.keepSourceAudio,
      applyColorFix: normalized.applyColorFix,
      ...(resolvedTargetVideoId ? { targetVideoId: resolvedTargetVideoId } : {}),
      ...(resolvedTargetClipNumber ? { targetClipNumber: resolvedTargetClipNumber } : {}),
      ...(normalized.previousClipVideoUrl
        ? { previousClipVideoUrl: normalized.previousClipVideoUrl }
        : {}),
      createdAt: now,
      updatedAt: now,
    };

    const col = await teleportJobsCollection();
    await col.insertOne(doc);

    after(() =>
      runTeleportJobInBackground(jobId).catch((error) => {
        console.error("[teleport] background job failed", { jobId: jobId.toHexString(), error });
      }),
    );

    safeRevalidate();
    return { ok: true, job: toPublicTeleportJob(doc) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "啟動 Teleport 失敗",
    };
  }
}

/** Background worker: frames, scene plate, SAM mask, identity, relocated keyframes, then video submit/poll. */
export async function runTeleportJobInBackground(jobId: ObjectId): Promise<void> {
  const col = await teleportJobsCollection();
  const job = (await col.findOne({ _id: jobId })) as TeleportJobDoc | null;
  if (!job || job.status !== "rendering") return;
  // Already submitted: `advanceTeleportJobs` owns it from here.
  if (job.openRouterStatusUrl) return;

  try {
    const videoRes = await fetch(job.sourceVideoUrl);
    if (!videoRes.ok) throw new Error("無法讀取來源影片檔案");
    const sourceVideoBuffer = Buffer.from(await videoRes.arrayBuffer());

    const extracted = await extractVideoSectionKeyframes(
      sourceVideoBuffer,
      job.sectionStart,
      job.sectionLength,
    );
    const effectiveSectionLength = extracted.actualDuration;

    const prefix = `explainer/teleport/${job.userId.toHexString()}/${job._id.toHexString()}`;
    const [rawStartFrameUrl, rawEndFrameUrl] = await Promise.all([
      persistBuffer(extracted.startFrameWebp, `${prefix}/raw-start.webp`, "image/webp"),
      persistBuffer(extracted.endFrameWebp, `${prefix}/raw-end.webp`, "image/webp"),
    ]);
    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          sectionLength: effectiveSectionLength,
          rawStartFrameUrl,
          rawEndFrameUrl,
          updatedAt: new Date(),
        },
      },
    );

    // SAM mannequin, scene plate, and section audio extraction do not depend on each other.
    const [samResult, scene, sectionAudioMp3] = await Promise.all([
      buildSam3MannequinAndMaskVideos({
        sourceVideoBuffer,
        sectionStart: job.sectionStart,
        sectionLength: effectiveSectionLength,
        target: "person",
        margin: "normal",
        hatFix: false,
        motionSize: 768,
        // Openjutsu object-swap background: flip the grown person mask and grey the surroundings.
        maskMode: "background",
      }).catch((error) => {
        console.error("[teleport] mannequin failed", { jobId: job._id.toHexString(), error });
        return null;
      }),
      (async () => {
        if (job.sceneImageUrl) {
          return { sceneImageUrl: job.sceneImageUrl, scenePlateGenerated: false };
        }
        const plate = await seedreamWebp({
          prompt: buildTeleportScenePlatePrompt(job.scenePrompt ?? "", job.aspectRatio),
          aspectRatio: job.aspectRatio,
        });
        const sceneImageUrl = await persistBuffer(
          plate,
          `${prefix}/scene-plate.webp`,
          "image/webp",
        );
        return { sceneImageUrl, scenePlateGenerated: true };
      })(),
      job.keepSourceAudio !== false
        ? extractVideoSectionAudioMp3(
            sourceVideoBuffer,
            job.sectionStart,
            effectiveSectionLength,
          )
        : Promise.resolve(null),
    ]);

    const firstSubjectMask = samResult?.firstSubjectMask ?? null;
    const identityIgnoresBackground = !firstSubjectMask;
    const identityBuffer = firstSubjectMask
      ? await cutSubjectOntoPlain(
          extracted.startFrameWebp,
          firstSubjectMask.mask,
          firstSubjectMask.width,
          firstSubjectMask.height,
        )
      : extracted.startFrameWebp;

    const [identityFrameUrl, mannequinVideoUrl, sectionAudioUrl] = await Promise.all([
      persistBuffer(identityBuffer, `${prefix}/identity.webp`, "image/webp"),
      samResult
        ? persistBuffer(samResult.mannequinVideoBuffer, `${prefix}/mannequin.mp4`, "video/mp4")
        : Promise.resolve(undefined),
      sectionAudioMp3
        ? persistBuffer(sectionAudioMp3, `${prefix}/section-audio.mp3`, "audio/mpeg")
        : Promise.resolve(undefined),
    ]);
    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          sceneImageUrl: scene.sceneImageUrl,
          scenePlateGenerated: scene.scenePlateGenerated,
          identityFrameUrl,
          mannequinVideoUrl,
          sectionAudioUrl,
          updatedAt: new Date(),
        },
      },
    );

    // Upsample the relocate prompts against [raw frame, scene] so Seedream keeps the person and enters the place.
    const sceneBuffer = await fetchBufferOrNull(scene.sceneImageUrl);
    const withScene = (raw: Buffer) => (sceneBuffer ? [raw, sceneBuffer] : [raw]);
    // H3 ref2va animates the start still. The end still is only for the Hailuo fallback.
    const h3Ready = hasMinimaxApiKey();
    const [startPrompt, endPrompt] = await Promise.all([
      upsampleJutsuFramePrompt({
        baseRequest: buildTeleportRelocatePrompt({ moment: "start", scenePrompt: job.scenePrompt }),
        imageBuffers: withScene(extracted.startFrameWebp),
      }),
      h3Ready
        ? Promise.resolve(null)
        : upsampleJutsuFramePrompt({
            baseRequest: buildTeleportRelocatePrompt({ moment: "end", scenePrompt: job.scenePrompt }),
            imageBuffers: withScene(extracted.endFrameWebp),
          }),
    ]);

    const [preparedStart, preparedEnd] = await Promise.all([
      seedreamWebp({
        prompt: startPrompt,
        aspectRatio: job.aspectRatio,
        referenceImageUrls: [rawStartFrameUrl, scene.sceneImageUrl],
      }),
      endPrompt
        ? seedreamWebp({
            prompt: endPrompt,
            aspectRatio: job.aspectRatio,
            referenceImageUrls: [rawEndFrameUrl, scene.sceneImageUrl],
          })
        : Promise.resolve(null),
    ]);
    const [preparedStartFrameUrl, preparedEndFrameUrl] = await Promise.all([
      persistBuffer(preparedStart, `${prefix}/prepared-start.webp`, "image/webp"),
      preparedEnd
        ? persistBuffer(preparedEnd, `${prefix}/prepared-end.webp`, "image/webp")
        : Promise.resolve(undefined),
    ]);

    const motionText = await describeJutsuVideoMotion({
      sampledFrameBuffers: extracted.sampledFramesJpeg,
      preparedFrameBuffer: preparedStart,
    });

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          preparedStartFrameUrl,
          ...(preparedEndFrameUrl ? { preparedEndFrameUrl } : {}),
          editPrompt: startPrompt,
          motionDescription: motionText,
          updatedAt: new Date(),
        },
      },
    );

    await syncStandaloneEngineFrame({
      targetVideoId: job.targetVideoId,
      targetClipNumber: job.targetClipNumber,
      aspectRatio: extracted.aspectRatio,
      durationSeconds: effectiveSectionLength,
      posterUrl: preparedStartFrameUrl,
    });

    const engine = chooseTeleportVideoEngine({
      hasMannequin: Boolean(mannequinVideoUrl),
      hasMinimaxKey: hasMinimaxApiKey(),
    });
    const prompt = buildTeleportVideoPrompt({
      engine,
      motionText,
      scenePrompt: job.scenePrompt,
      identityIgnoresBackground,
      hasReferenceAudio: Boolean(sectionAudioUrl),
    });
    const durationSeconds = teleportSubmitDurationSeconds(effectiveSectionLength);

    // OpenJutsu object/background keeps the person and repaints the setting inside the mask.
    const comfySubmitted = await trySubmitTeleportComfy(job);
    const submitted = comfySubmitted
      ? comfySubmitted
      : engine === "h3" && mannequinVideoUrl
        ? await submitMinimaxH3Ref2VaVideo({
            prompt,
            preparedImageUrl: preparedStartFrameUrl,
            identityImageUrl: identityFrameUrl,
            mannequinVideoUrl,
            audioUrl: sectionAudioUrl,
            noLipSync: false,
            durationSeconds,
            aspectRatio: job.aspectRatio,
          })
        : await submitOpenRouterClipVideo({
            model: OPENROUTER_HAILUO_3_VIDEO_MODEL,
            prompt,
            aspectRatio: job.aspectRatio,
            durationSeconds,
            startImageUrl: preparedStartFrameUrl,
            endImageUrl: preparedEndFrameUrl || preparedStartFrameUrl,
          });

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          openRouterRequestId: submitted.request_id,
          openRouterStatusUrl: submitted.status_url,
          motionDescription: motionText,
          updatedAt: new Date(),
        },
      },
    );

    let rawVideoUrl = submitted.video?.url;
    if (!rawVideoUrl && submitted.status_url) {
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((r) => setTimeout(r, 3500));
        const polled = await pollStatusOnce(submitted.status_url);
        if (polled.status === "completed" && polled.video?.url) {
          rawVideoUrl = polled.video.url;
          break;
        }
        if (polled.status === "failed" || polled.status === "nsfw") {
          throw new Error(polled.error || "影片渲染失敗");
        }
      }
    }

    // No URL yet: leave the job `rendering` for `advanceTeleportJobs`.
    if (rawVideoUrl) {
      const latest = (await col.findOne({ _id: job._id })) as TeleportJobDoc | null;
      await finalizeTeleportRenderedVideo(latest ?? job, rawVideoUrl);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Teleport 渲染失敗";
    await col.updateOne(
      { _id: jobId },
      { $set: { status: "failed", error: msg, updatedAt: new Date() } },
    );
    await settleTargetClipFromEngineJob({
      targetVideoId: job.targetVideoId,
      targetClipNumber: job.targetClipNumber,
      previousClipVideoUrl: job.previousClipVideoUrl,
      status: "failed",
      error: msg,
    });
  }
}

/** Download the provider video, optionally grade + mux source audio, persist, and complete the job. */
async function finalizeTeleportRenderedVideo(
  job: TeleportJobDoc,
  rawVideoUrl: string,
): Promise<{ ok: true; job: PublicTeleportJob }> {
  const headers = {
    ...openRouterAuthHeaders(rawVideoUrl),
    ...comfyViewAuthHeaders(rawVideoUrl),
  };
  const res = await fetch(rawVideoUrl, Object.keys(headers).length ? { headers } : undefined);
  if (!res.ok) {
    throw new Error(`無法下載渲染影片（HTTP ${res.status}）`);
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

  if (job.keepSourceAudio !== false) {
    const srcBuf = await fetchBufferOrNull(job.sourceVideoUrl);
    if (srcBuf) {
      videoBuf = Buffer.from(
        await muxSourceSectionAudio(videoBuf, srcBuf, job.sectionStart, job.sectionLength),
      );
    }
  }

  const prefix = `explainer/teleport/${job.userId.toHexString()}/${job._id.toHexString()}`;
  const outputVideoUrl = await persistBuffer(videoBuf, `${prefix}/output.mp4`, "video/mp4");

  const now = new Date();
  const col = await teleportJobsCollection();
  await col.updateOne(
    { _id: job._id },
    { $set: { status: "completed", outputVideoUrl, error: undefined, updatedAt: now } },
  );

  await settleTargetClipFromEngineJob({
    targetVideoId: job.targetVideoId,
    targetClipNumber: job.targetClipNumber,
    previousClipVideoUrl: job.previousClipVideoUrl,
    status: "completed",
    outputVideoUrl,
  });

  safeRevalidate();
  return {
    ok: true,
    job: toPublicTeleportJob({
      ...job,
      status: "completed",
      outputVideoUrl,
      error: undefined,
      updatedAt: now,
    }),
  };
}

/** Advance in-flight `teleport_jobs` in parallel (task polling and the refresh cron). */
export async function advanceTeleportJobs(clerkUserId?: string): Promise<number> {
  const col = await teleportJobsCollection();
  const filter: Record<string, unknown> = { status: "rendering" };
  if (clerkUserId) filter.clerkUserId = clerkUserId;
  const active = (await col
    .find(filter)
    .sort({ updatedAt: 1 })
    .limit(50)
    .toArray()) as TeleportJobDoc[];

  const nowMs = Date.now();
  const staleCutoff = nowMs - 25 * 60 * 1000;
  const stuckPrepCutoff = nowMs - 3 * 60 * 1000;

  const outcomes = await Promise.allSettled(
    active.map(async (job): Promise<number> => {
      try {
        if (!job.openRouterStatusUrl) {
          if (job.createdAt.getTime() < staleCutoff) {
            const timeoutErr = "Teleport 處理逾時，請重試";
            await col.updateOne(
              { _id: job._id },
              { $set: { status: "failed", error: timeoutErr, updatedAt: new Date() } },
            );
            await settleTargetClipFromEngineJob({
              targetVideoId: job.targetVideoId,
              targetClipNumber: job.targetClipNumber,
              previousClipVideoUrl: job.previousClipVideoUrl,
              status: "failed",
              error: timeoutErr,
            });
            return 1;
          }
          if (job.updatedAt.getTime() < stuckPrepCutoff) {
            await col.updateOne(
              { _id: job._id },
              { $set: { updatedAt: new Date() } },
            );
            await runTeleportJobInBackground(job._id);
            return 1;
          }
          return 0;
        }

        const polled = await pollStatusOnce(job.openRouterStatusUrl);

        if (polled.status === "completed" && polled.video?.url) {
          try {
            await finalizeTeleportRenderedVideo(job, polled.video.url);
          } catch (error) {
            console.error("[teleport] finalize failed", { jobId: job._id.toHexString(), error });
            const msg = error instanceof Error ? error.message : "Teleport 渲染失敗";
            await col.updateOne(
              { _id: job._id },
              { $set: { status: "failed", error: msg, updatedAt: new Date() } },
            );
            await settleTargetClipFromEngineJob({
              targetVideoId: job.targetVideoId,
              targetClipNumber: job.targetClipNumber,
              previousClipVideoUrl: job.previousClipVideoUrl,
              status: "failed",
              error: msg,
            });
          }
          return 1;
        }
        if (polled.status === "failed" || polled.status === "nsfw") {
          const err = polled.error || "影片渲染失敗";
          await col.updateOne(
            { _id: job._id },
            { $set: { status: "failed", error: err, updatedAt: new Date() } },
          );
          await settleTargetClipFromEngineJob({
            targetVideoId: job.targetVideoId,
            targetClipNumber: job.targetClipNumber,
            previousClipVideoUrl: job.previousClipVideoUrl,
            status: "failed",
            error: err,
          });
          return 1;
        }
        if (job.createdAt.getTime() < nowMs - comfyRenderStaleMs(job.openRouterStatusUrl)) {
          const timeoutErr = "Teleport 渲染逾時，請重試";
          await col.updateOne(
            { _id: job._id },
            { $set: { status: "failed", error: timeoutErr, updatedAt: new Date() } },
          );
          await settleTargetClipFromEngineJob({
            targetVideoId: job.targetVideoId,
            targetClipNumber: job.targetClipNumber,
            previousClipVideoUrl: job.previousClipVideoUrl,
            status: "failed",
            error: timeoutErr,
          });
          return 1;
        }
        return 0;
      } catch (error) {
        console.error("[teleport] advance failed", { jobId: job._id.toHexString(), error });
        return 0;
      }
    }),
  );

  return outcomes.reduce(
    (sum, res) => sum + (res.status === "fulfilled" ? res.value : 0),
    0,
  );
}

/** Poll one owned Teleport job once and finalize or fail it. */
export async function pollTeleportJobStatus(
  jobId: string,
): Promise<{ ok: true; job: PublicTeleportJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) {
      return { ok: false, error: "找不到 Teleport 任務" };
    }
    const col = await teleportJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    })) as TeleportJobDoc | null;
    if (!job) return { ok: false, error: "找不到 Teleport 任務" };

    if (job.status !== "rendering" || !job.openRouterStatusUrl) {
      return { ok: true, job: toPublicTeleportJob(job) };
    }

    const polled = await pollStatusOnce(job.openRouterStatusUrl);
    if (polled.status === "completed" && polled.video?.url) {
      return await finalizeTeleportRenderedVideo(job, polled.video.url);
    }
    if (polled.status === "failed" || polled.status === "nsfw") {
      const err = polled.error || "影片渲染失敗";
      const now = new Date();
      await col.updateOne(
        { _id: job._id },
        { $set: { status: "failed", error: err, updatedAt: now } },
      );
      await settleTargetClipFromEngineJob({
        targetVideoId: job.targetVideoId,
        targetClipNumber: job.targetClipNumber,
        previousClipVideoUrl: job.previousClipVideoUrl,
        status: "failed",
        error: err,
      });
      return {
        ok: true,
        job: toPublicTeleportJob({ ...job, status: "failed", error: err, updatedAt: now }),
      };
    }

    return { ok: true, job: toPublicTeleportJob(job) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "查詢進度失敗",
    };
  }
}

/** Newest-first Teleport jobs for one user. */
export async function listTeleportJobs(
  clerkUserId: string,
  limit = 24,
): Promise<PublicTeleportJob[]> {
  const col = await teleportJobsCollection();
  const docs = (await col
    .find({ clerkUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as TeleportJobDoc[];
  return docs.map(toPublicTeleportJob);
}

/** Delete one owned Teleport job. */
export async function deleteTeleportJob(
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) return { ok: false, error: "找不到任務" };
    const col = await teleportJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    })) as TeleportJobDoc | null;
    await col.deleteOne({ _id: new ObjectId(jobId), clerkUserId: user.clerkUserId });
    if (job?.targetVideoId) {
      await deleteStandaloneEngineProjectIfOwned(job.targetVideoId, user.clerkUserId);
    }
    try {
      revalidatePath("/app/teleport");
      revalidatePath("/app/videos");
    } catch {
      // Non-request context
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除失敗",
    };
  }
}
