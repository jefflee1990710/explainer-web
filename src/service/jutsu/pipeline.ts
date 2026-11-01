import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { charactersCollection, jutsuJobsCollection } from "@/dao";
import {
  toPublicJutsuJob,
  type JutsuColorSettings,
  type JutsuJob,
  type JutsuMode,
  type JutsuObjectEditMode,
  type JutsuPlacementBox,
  type PublicJutsuJob,
} from "@/model/jutsu-job";
import type { AspectRatio } from "@/model/project";
import { requireAppUser } from "@/service/auth";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  applyJutsuColorGradeBuffer,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-grade";
import {
  buildDefaultJutsuEditPrompt,
  describeJutsuVideoMotion,
  upsampleJutsuFramePrompt,
} from "@/service/jutsu/describer";
import { resolveJutsuLightText } from "@/service/jutsu/light-looks";
import {
  buildJutsuRef2VaPrompt,
  hasMinimaxApiKey,
  submitMinimaxH3Ref2VaVideo,
} from "@/service/jutsu/minimax-h3-ref2va";
import {
  buildSam3MannequinAndMaskVideos,
  type JutsuMaskMargin,
  type JutsuMotionSize,
} from "@/service/jutsu/sam-mannequin";
import {
  fetchMinimaxVideoStatus,
  isMinimaxVideoStatusUrl,
} from "@/service/minimax/talking-head-reference";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { blobStoreHost, isBrandAssetUrl } from "@/service/video-edit/edit-state";

export const JUTSU_MIN_SECTION_SECONDS = 2;
export const JUTSU_MAX_SECTION_SECONDS = 15;
export const JUTSU_DEFAULT_SECTION_SECONDS = 6;

export const JUTSU_PLACES = ["Whole", "Start", "Middle", "End"] as const;
export type JutsuPlace = (typeof JUTSU_PLACES)[number];

/** Ported from Openjutsu `placeStart` (`lib/simple.ts`). */
export function computeJutsuPlaceStart(
  place: JutsuPlace,
  duration: number,
  length: number,
): number {
  const safeDuration = Math.max(0, duration);
  const safeLen = Math.min(safeDuration, Math.max(0, length));
  if (place === "Middle") return Math.max(0, (safeDuration - safeLen) / 2);
  if (place === "End") return Math.max(0, safeDuration - safeLen);
  return 0;
}

/** Ported from Openjutsu `pictureFrames` (`lib/picture.ts`): H3 17k+5 frame grid at 24fps. */
export function computeJutsuH3Frames(seconds: number): number {
  return Math.max(
    5,
    Math.floor((Math.floor(seconds * 24 + 1e-6) - 5) / 17) * 17 + 5,
  );
}

/** Extract start frame, end frame, and 4 intermediate motion-sampling frames + detect aspect ratio. */
export async function extractVideoSectionKeyframes(
  videoBuffer: Buffer,
  sectionStart: number,
  sectionLength: number,
): Promise<{
  startFrameWebp: Buffer;
  endFrameWebp: Buffer;
  sampledFramesJpeg: Buffer[];
  aspectRatio: AspectRatio;
  actualDuration: number;
}> {
  const dir = await mkdtemp(join(tmpdir(), "jutsu-frames-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBuffer);
    const probe = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    const durMatch = probe.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    const totalDur = durMatch
      ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
      : sectionLength;

    const startSec = Math.max(0, Math.min(sectionStart, Math.max(0, totalDur - 0.5)));
    const lenSec = Math.max(
      1,
      Math.min(
        JUTSU_MAX_SECTION_SECONDS,
        sectionLength > 0 ? sectionLength : totalDur - startSec,
        Math.max(1, totalDur - startSec),
      ),
    );
    const endSec = Math.max(startSec + 0.2, startSec + lenSec - 0.15);

    // Extract start and end frames
    await runFfmpeg(dir, [
      "-y",
      "-ss",
      String(startSec.toFixed(2)),
      "-i",
      "in.mp4",
      "-frames:v",
      "1",
      "start.png",
    ]);
    await runFfmpeg(dir, [
      "-y",
      "-ss",
      String(endSec.toFixed(2)),
      "-i",
      "in.mp4",
      "-frames:v",
      "1",
      "end.png",
    ]);

    const startRaw = await readFile(join(dir, "start.png"));
    const endRaw = await readFile(join(dir, "end.png")).catch(() => startRaw);
    const meta = await sharp(startRaw).metadata();
    const w = meta.width || 768;
    const h = meta.height || 1365;
    const aspectRatio: AspectRatio =
      Math.abs(w - h) < Math.min(w, h) * 0.15
        ? "1:1"
        : w > h
          ? "16:9"
          : "9:16";

    const [startFrameWebp, endFrameWebp] = await Promise.all([
      sharp(startRaw).webp({ quality: 88 }).toBuffer(),
      sharp(endRaw).webp({ quality: 88 }).toBuffer(),
    ]);

    // Sample 4 frames across the section for Two-Pass VLM motion description
    const sampleTimes = [0, 0.33, 0.66, 0.95].map(
      (r) => startSec + lenSec * r,
    );
    const sampledFramesJpeg: Buffer[] = [];
    for (let i = 0; i < sampleTimes.length; i++) {
      const fName = `sample-${i}.jpg`;
      await runFfmpeg(dir, [
        "-y",
        "-ss",
        String(sampleTimes[i]!.toFixed(2)),
        "-i",
        "in.mp4",
        "-frames:v",
        "1",
        "-q:v",
        "4",
        fName,
      ]).catch(() => {});
      const buf = await readFile(join(dir, fName)).catch(() => null);
      if (buf) sampledFramesJpeg.push(buf);
    }

    return {
      startFrameWebp,
      endFrameWebp,
      sampledFramesJpeg,
      aspectRatio,
      actualDuration: Math.round(lenSec * 10) / 10,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Generate a prepared keyframe 100% via OpenRouter `seedream-5-0-pro`. */
async function generatePreparedKeyframeBuffer(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  referenceImageUrls: string[];
}): Promise<Buffer> {
  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    referenceImageUrls: input.referenceImageUrls,
  });
  const url = res.images?.[0]?.url;
  if (!url) {
    throw new Error("OpenRouter Seedream 5.0 Pro 未回傳圖片");
  }
  const raw = url.startsWith("data:")
    ? Buffer.from(url.split(",")[1] || "", "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  return sharp(raw).webp({ quality: 88 }).toBuffer();
}

/** Mux the source video section's original audio stream onto the rendered Jutsu video. */
export async function muxSourceSectionAudio(
  renderedVideoBuffer: Buffer,
  sourceVideoBuffer: Buffer,
  sectionStart: number,
  sectionLength: number,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "jutsu-mux-"));
  try {
    await writeFile(join(dir, "rendered.mp4"), renderedVideoBuffer);
    await writeFile(join(dir, "source.mp4"), sourceVideoBuffer);

    const probe = await ffmpegStderr(dir, ["-i", "source.mp4"]);
    if (!/Audio:/.test(probe)) {
      return renderedVideoBuffer;
    }

    await runFfmpeg(dir, [
      "-y",
      "-i",
      "rendered.mp4",
      "-ss",
      String(Math.max(0, sectionStart).toFixed(2)),
      "-t",
      String(Math.max(1, sectionLength).toFixed(2)),
      "-i",
      "source.mp4",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0?",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      "out.mp4",
    ]);
    return await readFile(join(dir, "out.mp4"));
  } catch {
    return renderedVideoBuffer;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export type PrepareJutsuJobInput = {
  mode: JutsuMode;
  sourceVideoUrl: string;
  sectionStart?: number;
  sectionLength?: number;
  characterId?: string;
  referenceImageUrl?: string;
  relightId?: string;
  customLightPrompt?: string;
  objectEditMode?: JutsuObjectEditMode;
  objectTarget?: string;
  objectChangeTo?: string;
  placementBox?: JutsuPlacementBox;
  maskMargin?: JutsuMaskMargin;
  hatFix?: boolean;
  noLipSync?: boolean;
  motionSize?: JutsuMotionSize;
  customEditPrompt?: string;
  colorSettings?: JutsuColorSettings;
};

/**
 * Step 1 of Jutsu Studio (Prepare Preview Image & Motion Plan, or Run Color Fix directly):
 * - Extracts raw start & end frames from the selected section of `sourceVideoUrl`.
 * - Resolves any selected Scro `Character` blueprint.
 * - Runs VLM prompt upsampler + OpenRouter `seedream-5-0-pro` to prepare the swapped/relit start & end keyframes.
 * - Runs Openjutsu's Two-Pass VLM Motion Describer to prefill `motionDescription`.
 */
export async function prepareJutsuJob(
  input: PrepareJutsuJobInput,
): Promise<{ ok: true; job: PublicJutsuJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
    const sourceUrl = input.sourceVideoUrl.trim();
    if (!sourceUrl.startsWith("https://")) {
      return { ok: false, error: "請先上傳來源影片" };
    }
    if (
      storeHost &&
      !isBrandAssetUrl(sourceUrl, user.clerkUserId, storeHost) &&
      !sourceUrl.includes(".public.blob.vercel-storage.com/")
    ) {
      return { ok: false, error: "來源影片網址無效" };
    }

    // Resolve Scro Character blueprint if `characterId` is chosen
    let characterName: string | undefined;
    let donorImageUrl = input.referenceImageUrl?.trim() || undefined;
    if (input.characterId && ObjectId.isValid(input.characterId)) {
      const charCol = await charactersCollection();
      const charDoc = await charCol.findOne({
        _id: new ObjectId(input.characterId),
        clerkUserId: user.clerkUserId,
      });
      if (charDoc) {
        characterName = charDoc.name;
        const completedVer = [...(charDoc.versions || [])]
          .reverse()
          .find((v) => v.status === "completed" && (v.portraitUrl || v.blueprintUrl));
        donorImageUrl =
          completedVer?.portraitUrl ||
          completedVer?.blueprintUrl ||
          donorImageUrl;
      }
    }

    if (input.mode === "character_swap" && !donorImageUrl) {
      return { ok: false, error: "請選擇一個 Scro 角色或上傳角色參考圖片" };
    }

    const videoRes = await fetch(sourceUrl);
    if (!videoRes.ok) {
      return { ok: false, error: "無法讀取來源影片檔案" };
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const sectionStart = Math.max(0, Number(input.sectionStart) || 0);
    const sectionLength = Math.min(
      JUTSU_MAX_SECTION_SECONDS,
      Math.max(
        JUTSU_MIN_SECTION_SECONDS,
        Number(input.sectionLength) || JUTSU_DEFAULT_SECTION_SECONDS,
      ),
    );

    const jobId = new ObjectId();
    const prefix = `explainer/jutsu/${user._id.toHexString()}/${jobId.toHexString()}`;

    // Mode 4: Color Fix runs FFmpeg directly and completes immediately
    if (input.mode === "color_fix") {
      const colorSettings = input.colorSettings ?? DEFAULT_JUTSU_COLOR_SETTINGS;
      const gradedBuffer = await applyJutsuColorGradeBuffer(
        videoBuffer,
        colorSettings,
      );
      const outputVideoUrl = await persistBuffer(
        gradedBuffer,
        `${prefix}/color-fixed-${Date.now()}.mp4`,
        "video/mp4",
      );
      const now = new Date();
      const doc: JutsuJob & { _id: ObjectId } = {
        _id: jobId,
        userId: user._id,
        clerkUserId: user.clerkUserId,
        mode: "color_fix",
        status: "completed",
        sourceVideoUrl: sourceUrl,
        aspectRatio: "9:16",
        sectionStart,
        sectionLength,
        colorSettings,
        outputVideoUrl,
        createdAt: now,
        updatedAt: now,
      };
      const col = await jutsuJobsCollection();
      await col.insertOne(doc);
      revalidatePath("/app/jutsu");
      return { ok: true, job: toPublicJutsuJob(doc) };
    }

    // Extract start & end frames + 4 motion sample frames
    const extracted = await extractVideoSectionKeyframes(
      videoBuffer,
      sectionStart,
      sectionLength,
    );

    const [rawStartFrameUrl, rawEndFrameUrl] = await Promise.all([
      persistBuffer(
        extracted.startFrameWebp,
        `${prefix}/raw-start.webp`,
        "image/webp",
      ),
      persistBuffer(
        extracted.endFrameWebp,
        `${prefix}/raw-end.webp`,
        "image/webp",
      ),
    ]);

    const baseEditRequest =
      input.customEditPrompt?.trim() ||
      buildDefaultJutsuEditPrompt({
        mode: input.mode,
        relightId: input.relightId,
        customLightPrompt: input.customLightPrompt,
        objectEditMode: input.objectEditMode,
        objectTarget: input.objectTarget,
        objectChangeTo: input.objectChangeTo,
        hasReferenceImage: Boolean(donorImageUrl),
        placementBox: input.placementBox,
      });

    // Load donor image buffer if present for the VLM prompt upsampler
    const upsamplerBuffers: Buffer[] = [];
    if (input.mode === "character_swap" && donorImageUrl) {
      const donorBuf = await fetch(donorImageUrl)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => (ab ? Buffer.from(ab) : null))
        .catch(() => null);
      if (donorBuf) upsamplerBuffers.push(donorBuf);
      upsamplerBuffers.push(extracted.startFrameWebp);
    } else {
      upsamplerBuffers.push(extracted.startFrameWebp);
      if (donorImageUrl) {
        const donorBuf = await fetch(donorImageUrl)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((ab) => (ab ? Buffer.from(ab) : null))
          .catch(() => null);
        if (donorBuf) upsamplerBuffers.push(donorBuf);
      }
    }

    const upsampledStartPrompt = await upsampleJutsuFramePrompt({
      baseRequest: baseEditRequest,
      imageBuffers: upsamplerBuffers,
    });

    // Reference order:
    // - character_swap: [donorImageUrl, rawFrameUrl]
    // - object_swap: [rawFrameUrl, donorImageUrl?]
    // - relight_video: [rawFrameUrl]
    const startRefs =
      input.mode === "character_swap" && donorImageUrl
        ? [donorImageUrl, rawStartFrameUrl]
        : donorImageUrl
          ? [rawStartFrameUrl, donorImageUrl]
          : [rawStartFrameUrl];

    const endRefs =
      input.mode === "character_swap" && donorImageUrl
        ? [donorImageUrl, rawEndFrameUrl]
        : donorImageUrl
          ? [rawEndFrameUrl, donorImageUrl]
          : [rawEndFrameUrl];

    const [preparedStartBuf, preparedEndBuf] = await Promise.all([
      generatePreparedKeyframeBuffer({
        prompt: upsampledStartPrompt,
        aspectRatio: extracted.aspectRatio,
        referenceImageUrls: startRefs,
      }),
      generatePreparedKeyframeBuffer({
        prompt: upsampledStartPrompt,
        aspectRatio: extracted.aspectRatio,
        referenceImageUrls: endRefs,
      }),
    ]);

    const maskMargin: JutsuMaskMargin = input.maskMargin ?? "normal";
    const hatFix = Boolean(input.hatFix);
    const noLipSync = Boolean(input.noLipSync);
    const motionSize: JutsuMotionSize = input.motionSize ?? 512;

    const [
      preparedStartFrameUrl,
      preparedEndFrameUrl,
      motionDescription,
      samMannequinResult,
    ] = await Promise.all([
      persistBuffer(
        preparedStartBuf,
        `${prefix}/prepared-start-${Date.now()}.webp`,
        "image/webp",
      ),
      persistBuffer(
        preparedEndBuf,
        `${prefix}/prepared-end-${Date.now()}.webp`,
        "image/webp",
      ),
      describeJutsuVideoMotion({
        sampledFrameBuffers: extracted.sampledFramesJpeg,
        preparedFrameBuffer:
          input.mode === "relight_video" ? undefined : preparedStartBuf,
        characterName,
        relightText: resolveJutsuLightText(
          input.relightId,
          input.customLightPrompt,
        ),
      }),
      buildSam3MannequinAndMaskVideos({
        sourceVideoBuffer: videoBuffer,
        sectionStart,
        sectionLength: extracted.actualDuration,
        target: input.objectTarget?.trim() || "person",
        margin: maskMargin,
        hatFix,
        motionSize,
        manualBox: input.placementBox,
      }).catch(() => null),
    ]);

    let mannequinVideoUrl: string | undefined;
    let checkMaskVideoUrl: string | undefined;
    if (samMannequinResult) {
      [mannequinVideoUrl, checkMaskVideoUrl] = await Promise.all([
        persistBuffer(
          samMannequinResult.mannequinVideoBuffer,
          `${prefix}/sam-mannequin-${Date.now()}.mp4`,
          "video/mp4",
        ),
        persistBuffer(
          samMannequinResult.checkMaskVideoBuffer,
          `${prefix}/check-mask-${Date.now()}.mp4`,
          "video/mp4",
        ),
      ]);
    }

    const now = new Date();
    const doc: JutsuJob & { _id: ObjectId } = {
      _id: jobId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      mode: input.mode,
      status: "prepared",
      sourceVideoUrl: sourceUrl,
      aspectRatio: extracted.aspectRatio,
      sectionStart,
      sectionLength: extracted.actualDuration,
      rawStartFrameUrl,
      rawEndFrameUrl,
      preparedStartFrameUrl,
      preparedEndFrameUrl,
      characterId: input.characterId,
      characterName,
      referenceImageUrl: donorImageUrl,
      relightId: input.relightId,
      customLightPrompt: input.customLightPrompt,
      objectEditMode: input.objectEditMode,
      objectTarget: input.objectTarget,
      objectChangeTo: input.objectChangeTo,
      placementBox: input.placementBox,
      maskMargin,
      hatFix,
      noLipSync,
      motionSize,
      mannequinVideoUrl,
      checkMaskVideoUrl,
      editPrompt: upsampledStartPrompt,
      motionDescription,
      colorSettings: input.colorSettings ?? DEFAULT_JUTSU_COLOR_SETTINGS,
      createdAt: now,
      updatedAt: now,
    };

    const col = await jutsuJobsCollection();
    await col.insertOne(doc);
    revalidatePath("/app/jutsu");

    return { ok: true, job: toPublicJutsuJob(doc) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "準備 Jutsu 預覽畫格失敗",
    };
  }
}

/**
 * Step 2 of Jutsu Studio (Render Video):
 * Submits the prepared start & end keyframes + two-pass motion description to OpenRouter `minimax/hailuo-3`,
 * polls until completion, muxes the original section soundtrack, and applies Openjutsu's H3 Soft color grade.
 */
export async function renderJutsuVideo(input: {
  jobId: string;
  motionDescription?: string;
  applyColorFix?: boolean;
  keepSourceAudio?: boolean;
}): Promise<{ ok: true; job: PublicJutsuJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.jobId)) {
      return { ok: false, error: "找不到 Jutsu 任務" };
    }
    const col = await jutsuJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(input.jobId),
      clerkUserId: user.clerkUserId,
    })) as (JutsuJob & { _id: ObjectId }) | null;

    if (!job) {
      return { ok: false, error: "找不到 Jutsu 任務" };
    }
    if (!job.preparedStartFrameUrl) {
      return { ok: false, error: "請先生成預覽圖片（Prepare Frame）" };
    }

    const motionText =
      (input.motionDescription ?? job.motionDescription ?? "").trim() ||
      "Continuous natural movement from the opening frame to the closing frame.";
    const lightText = resolveJutsuLightText(job.relightId, job.customLightPrompt);
    // MiniMax H3 reference-to-video cannot also take first/last frames (error 2013).
    const useH3Ref2Va = Boolean(job.mannequinVideoUrl && hasMinimaxApiKey());
    // Character swap: pass the original character photo so H3 does not drift from the redrawn still.
    const identityImageUrl =
      job.mode === "character_swap" ? job.referenceImageUrl : undefined;
    const fullVideoPrompt = useH3Ref2Va
      ? buildJutsuRef2VaPrompt({
          motionText,
          lightText,
          hasIdentityImage: Boolean(
            identityImageUrl && identityImageUrl !== job.preparedStartFrameUrl,
          ),
        })
      : [
          "[Shot 1] The shot begins from the attached first frame and transitions smoothly to the attached last frame.",
          motionText,
          lightText ? `Lighting remains consistent: ${lightText}` : "",
          "Preserve any on-screen text or graphic letters from the attached frames.",
        ]
          .filter(Boolean)
          .join(" ");

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "rendering",
          motionDescription: motionText,
          error: undefined,
          updatedAt: new Date(),
        },
      },
    );

    // Primary Motion Engine: MiniMax H3 `ref2va` (`reference_image` + `reference_video`).
    // Falls back to OpenRouter Hailuo-3 dual-keyframe if `MINIMAX_API_KEY` is not set.
    const submitted = useH3Ref2Va
      ? await submitMinimaxH3Ref2VaVideo({
          prompt: fullVideoPrompt,
          preparedImageUrl: job.preparedStartFrameUrl,
          identityImageUrl,
          mannequinVideoUrl: job.mannequinVideoUrl!,
          noLipSync: job.noLipSync,
          durationSeconds: Math.min(15, Math.max(5, Math.round(job.sectionLength))),
          aspectRatio: job.aspectRatio,
        })
      : await submitOpenRouterClipVideo({
          model: OPENROUTER_HAILUO_3_VIDEO_MODEL,
          prompt: fullVideoPrompt,
          aspectRatio: job.aspectRatio,
          durationSeconds: Math.min(15, Math.max(5, Math.round(job.sectionLength))),
          startImageUrl: job.preparedStartFrameUrl,
          endImageUrl: job.preparedEndFrameUrl || job.preparedStartFrameUrl,
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

    // If provider returned a synchronous video URL, finalize right away; otherwise poll up to 90s or let client poll
    let rawVideoUrl = submitted.video?.url;
    if (!rawVideoUrl && submitted.status_url) {
      const isMinimax = isMinimaxVideoStatusUrl(submitted.status_url);
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((r) => setTimeout(r, 3500));
        const polled = isMinimax
          ? await fetchMinimaxVideoStatus(submitted.status_url)
          : await fetchOpenRouterStatus(submitted.status_url);
        if (polled.status === "completed" && polled.video?.url) {
          rawVideoUrl = polled.video.url;
          break;
        }
        if (polled.status === "failed" || polled.status === "nsfw") {
          throw new Error(polled.error || "H3 影片渲染失敗");
        }
      }
    }

    if (rawVideoUrl) {
      return await finalizeJutsuRenderedVideo(job, rawVideoUrl, {
        applyColorFix: input.applyColorFix !== false,
        keepSourceAudio: input.keepSourceAudio !== false,
      });
    }

    const latest = (await col.findOne({ _id: job._id })) as JutsuJob & {
      _id: ObjectId;
    };
    return { ok: true, job: toPublicJutsuJob(latest) };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "渲染 Jutsu 影片失敗";
    if (ObjectId.isValid(input.jobId)) {
      const col = await jutsuJobsCollection();
      await col.updateOne(
        { _id: new ObjectId(input.jobId) },
        { $set: { status: "failed", error: msg, updatedAt: new Date() } },
      );
    }
    return { ok: false, error: msg };
  }
}

async function finalizeJutsuRenderedVideo(
  job: JutsuJob & { _id: ObjectId },
  rawVideoUrl: string,
  options?: { applyColorFix?: boolean; keepSourceAudio?: boolean },
): Promise<{ ok: true; job: PublicJutsuJob }> {
  const res = await fetch(rawVideoUrl);
  let videoBuf: Buffer = Buffer.from(await res.arrayBuffer());

  if (options?.applyColorFix !== false && job.applyColorFix !== false && job.colorSettings) {
    videoBuf = Buffer.from(
      await applyJutsuColorGradeBuffer(videoBuf, job.colorSettings).catch(
        () => videoBuf,
      ),
    );
  }

  if (options?.keepSourceAudio !== false && job.keepSourceAudio !== false && job.sourceVideoUrl) {
    const srcRes = await fetch(job.sourceVideoUrl).catch(() => null);
    if (srcRes?.ok) {
      const srcBuf = Buffer.from(await srcRes.arrayBuffer());
      videoBuf = Buffer.from(
        await muxSourceSectionAudio(
          videoBuf,
          srcBuf,
          job.sectionStart,
          job.sectionLength,
        ),
      );
    }
  }

  const prefix = `explainer/jutsu/${job.userId.toHexString()}/${job._id.toHexString()}`;
  const outputVideoUrl = await persistBuffer(
    videoBuf,
    `${prefix}/final-${Date.now()}.mp4`,
    "video/mp4",
  );

  const now = new Date();
  const col = await jutsuJobsCollection();
  await col.updateOne(
    { _id: job._id },
    {
      $set: {
        status: "completed",
        outputVideoUrl,
        error: undefined,
        updatedAt: now,
      },
    },
  );

  try {
    revalidatePath("/app/jutsu");
  } catch {
    // Non-request background / cron context
  }
  return {
    ok: true,
    job: toPublicJutsuJob({
      ...job,
      status: "completed",
      outputVideoUrl,
      updatedAt: now,
    }),
  };
}

export type StartScroSwapInput = {
  sourceVideoUrl: string;
  sectionStart?: number;
  sectionLength?: number;
  characterId?: string;
  referenceImageUrl?: string;
  relightId?: string;
  customLightPrompt?: string;
  maskMargin?: JutsuMaskMargin;
  hatFix?: boolean;
  noLipSync?: boolean;
  motionSize?: JutsuMotionSize;
  keepSourceAudio?: boolean;
  applyColorFix?: boolean;
  colorSettings?: JutsuColorSettings;
};

/**
 * One-step Scro Swap: creates a `rendering` job immediately and runs keyframe prepare +
 * SAM grey-mannequin + MiniMax H3 submit + polling in the background (`after()` + cron fallback).
 */
export async function startScroSwapJob(
  input: StartScroSwapInput,
): Promise<{ ok: true; job: PublicJutsuJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
    const sourceUrl = input.sourceVideoUrl.trim();
    if (!sourceUrl.startsWith("https://")) {
      return { ok: false, error: "請先上傳來源影片" };
    }
    if (
      storeHost &&
      !isBrandAssetUrl(sourceUrl, user.clerkUserId, storeHost) &&
      !sourceUrl.includes(".public.blob.vercel-storage.com/")
    ) {
      return { ok: false, error: "來源影片網址無效" };
    }

    let characterName: string | undefined;
    let donorImageUrl = input.referenceImageUrl?.trim() || undefined;
    if (input.characterId && ObjectId.isValid(input.characterId)) {
      const charCol = await charactersCollection();
      const charDoc = await charCol.findOne({
        _id: new ObjectId(input.characterId),
        clerkUserId: user.clerkUserId,
      });
      if (charDoc) {
        characterName = charDoc.name;
        const completedVer = [...(charDoc.versions || [])]
          .reverse()
          .find((v) => v.status === "completed" && (v.portraitUrl || v.blueprintUrl));
        donorImageUrl =
          completedVer?.portraitUrl ||
          completedVer?.blueprintUrl ||
          donorImageUrl;
      }
    }

    if (!donorImageUrl) {
      return { ok: false, error: "請選擇一個 Scro 角色或上傳角色參考圖片" };
    }

    const sectionStart = Math.max(0, Number(input.sectionStart) || 0);
    const sectionLength = Math.min(
      JUTSU_MAX_SECTION_SECONDS,
      Math.max(
        JUTSU_MIN_SECTION_SECONDS,
        Number(input.sectionLength) || JUTSU_DEFAULT_SECTION_SECONDS,
      ),
    );
    const maskMargin: JutsuMaskMargin = input.maskMargin ?? "normal";
    const hatFix = Boolean(input.hatFix);
    const noLipSync = Boolean(input.noLipSync);
    const motionSize: JutsuMotionSize = input.motionSize ?? 512;
    const keepSourceAudio = input.keepSourceAudio !== false;
    const applyColorFix = input.applyColorFix !== false;
    const colorSettings = input.colorSettings ?? DEFAULT_JUTSU_COLOR_SETTINGS;

    const now = new Date();
    const jobId = new ObjectId();
    const doc: JutsuJob & { _id: ObjectId } = {
      _id: jobId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      mode: "character_swap",
      status: "rendering",
      sourceVideoUrl: sourceUrl,
      aspectRatio: "9:16",
      sectionStart,
      sectionLength,
      characterId: input.characterId,
      characterName,
      referenceImageUrl: donorImageUrl,
      relightId: input.relightId,
      customLightPrompt: input.customLightPrompt,
      maskMargin,
      hatFix,
      noLipSync,
      motionSize,
      keepSourceAudio,
      applyColorFix,
      colorSettings,
      createdAt: now,
      updatedAt: now,
    };

    const col = await jutsuJobsCollection();
    await col.insertOne(doc);

    after(() =>
      runScroSwapJobInBackground(jobId).catch((error) => {
        console.error("[scro-swap] background job failed", { jobId: jobId.toHexString(), error });
      }),
    );

    try {
      revalidatePath("/app/jutsu");
    } catch {
      // Non-request context
    }
    return { ok: true, job: toPublicJutsuJob(doc) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "啟動 Scro Swap 失敗",
    };
  }
}

/** Background worker that prepares keyframes + mannequin and submits/polls the video render. */
export async function runScroSwapJobInBackground(jobId: ObjectId): Promise<void> {
  const col = await jutsuJobsCollection();
  const job = (await col.findOne({ _id: jobId })) as (JutsuJob & { _id: ObjectId }) | null;
  if (!job || job.status !== "rendering") return;

  try {
    let current = job;
    if (!current.preparedStartFrameUrl) {
      const videoRes = await fetch(current.sourceVideoUrl);
      if (!videoRes.ok) {
        throw new Error("無法讀取來源影片檔案");
      }
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      const extracted = await extractVideoSectionKeyframes(
        videoBuffer,
        current.sectionStart,
        current.sectionLength,
      );

      const prefix = `explainer/jutsu/${current.userId.toHexString()}/${current._id.toHexString()}`;
      const [rawStartFrameUrl, rawEndFrameUrl] = await Promise.all([
        persistBuffer(extracted.startFrameWebp, `${prefix}/raw-start.webp`, "image/webp"),
        persistBuffer(extracted.endFrameWebp, `${prefix}/raw-end.webp`, "image/webp"),
      ]);

      const donorImageUrl = current.referenceImageUrl;
      if (!donorImageUrl) {
        throw new Error("缺少角色參考圖片");
      }

      const baseEditRequest = buildDefaultJutsuEditPrompt({
        mode: "character_swap",
        relightId: current.relightId,
        customLightPrompt: current.customLightPrompt,
        hasReferenceImage: true,
      });

      const upsamplerBuffers: Buffer[] = [];
      const donorBuf = await fetch(donorImageUrl)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => (ab ? Buffer.from(ab) : null))
        .catch(() => null);
      if (donorBuf) upsamplerBuffers.push(donorBuf);
      upsamplerBuffers.push(extracted.startFrameWebp);

      const upsampledStartPrompt = await upsampleJutsuFramePrompt({
        baseRequest: baseEditRequest,
        imageBuffers: upsamplerBuffers,
      });

      const startRefs = [donorImageUrl, rawStartFrameUrl];
      const endRefs = [donorImageUrl, rawEndFrameUrl];

      const [preparedStartBuf, preparedEndBuf] = await Promise.all([
        generatePreparedKeyframeBuffer({
          prompt: upsampledStartPrompt,
          aspectRatio: extracted.aspectRatio,
          referenceImageUrls: startRefs,
        }),
        generatePreparedKeyframeBuffer({
          prompt: upsampledStartPrompt,
          aspectRatio: extracted.aspectRatio,
          referenceImageUrls: endRefs,
        }),
      ]);

      const [
        preparedStartFrameUrl,
        preparedEndFrameUrl,
        motionDescription,
        samMannequinResult,
      ] = await Promise.all([
        persistBuffer(
          preparedStartBuf,
          `${prefix}/prepared-start-${Date.now()}.webp`,
          "image/webp",
        ),
        persistBuffer(
          preparedEndBuf,
          `${prefix}/prepared-end-${Date.now()}.webp`,
          "image/webp",
        ),
        describeJutsuVideoMotion({
          sampledFrameBuffers: extracted.sampledFramesJpeg,
          preparedFrameBuffer: preparedStartBuf,
          characterName: current.characterName,
          relightText: resolveJutsuLightText(
            current.relightId,
            current.customLightPrompt,
          ),
        }),
        buildSam3MannequinAndMaskVideos({
          sourceVideoBuffer: videoBuffer,
          sectionStart: current.sectionStart,
          sectionLength: extracted.actualDuration,
          target: "person",
          margin: current.maskMargin ?? "normal",
          hatFix: Boolean(current.hatFix),
          motionSize: current.motionSize ?? 512,
        }).catch(() => null),
      ]);

      let mannequinVideoUrl: string | undefined;
      let checkMaskVideoUrl: string | undefined;
      if (samMannequinResult) {
        [mannequinVideoUrl, checkMaskVideoUrl] = await Promise.all([
          persistBuffer(
            samMannequinResult.mannequinVideoBuffer,
            `${prefix}/sam-mannequin-${Date.now()}.mp4`,
            "video/mp4",
          ),
          persistBuffer(
            samMannequinResult.checkMaskVideoBuffer,
            `${prefix}/check-mask-${Date.now()}.mp4`,
            "video/mp4",
          ),
        ]);
      }

      const prepNow = new Date();
      await col.updateOne(
        { _id: current._id },
        {
          $set: {
            aspectRatio: extracted.aspectRatio,
            sectionLength: extracted.actualDuration,
            rawStartFrameUrl,
            rawEndFrameUrl,
            preparedStartFrameUrl,
            preparedEndFrameUrl,
            mannequinVideoUrl,
            checkMaskVideoUrl,
            editPrompt: upsampledStartPrompt,
            motionDescription,
            updatedAt: prepNow,
          },
        },
      );

      current = {
        ...current,
        aspectRatio: extracted.aspectRatio,
        sectionLength: extracted.actualDuration,
        rawStartFrameUrl,
        rawEndFrameUrl,
        preparedStartFrameUrl,
        preparedEndFrameUrl,
        mannequinVideoUrl,
        checkMaskVideoUrl,
        editPrompt: upsampledStartPrompt,
        motionDescription,
        updatedAt: prepNow,
      };
    }

    if (!current.openRouterStatusUrl && current.preparedStartFrameUrl) {
      const motionText =
        (current.motionDescription ?? "").trim() ||
        "Continuous natural movement from the opening frame to the closing frame.";
      const lightText = resolveJutsuLightText(
        current.relightId,
        current.customLightPrompt,
      );
      const useH3Ref2Va = Boolean(current.mannequinVideoUrl && hasMinimaxApiKey());
      const identityImageUrl = current.referenceImageUrl;
      const fullVideoPrompt = useH3Ref2Va
        ? buildJutsuRef2VaPrompt({
            motionText,
            lightText,
            hasIdentityImage: Boolean(
              identityImageUrl && identityImageUrl !== current.preparedStartFrameUrl,
            ),
          })
        : [
            "[Shot 1] The shot begins from the attached first frame and transitions smoothly to the attached last frame.",
            motionText,
            lightText ? `Lighting remains consistent: ${lightText}` : "",
            "Preserve any on-screen text or graphic letters from the attached frames.",
          ]
            .filter(Boolean)
            .join(" ");

      const submitted = useH3Ref2Va
        ? await submitMinimaxH3Ref2VaVideo({
            prompt: fullVideoPrompt,
            preparedImageUrl: current.preparedStartFrameUrl,
            identityImageUrl,
            mannequinVideoUrl: current.mannequinVideoUrl!,
            noLipSync: current.noLipSync,
            durationSeconds: Math.min(
              15,
              Math.max(5, Math.round(current.sectionLength)),
            ),
            aspectRatio: current.aspectRatio,
          })
        : await submitOpenRouterClipVideo({
            model: OPENROUTER_HAILUO_3_VIDEO_MODEL,
            prompt: fullVideoPrompt,
            aspectRatio: current.aspectRatio,
            durationSeconds: Math.min(
              15,
              Math.max(5, Math.round(current.sectionLength)),
            ),
            startImageUrl: current.preparedStartFrameUrl,
            endImageUrl: current.preparedEndFrameUrl || current.preparedStartFrameUrl,
          });

      await col.updateOne(
        { _id: current._id },
        {
          $set: {
            openRouterRequestId: submitted.request_id,
            openRouterStatusUrl: submitted.status_url,
            updatedAt: new Date(),
          },
        },
      );

      let rawVideoUrl = submitted.video?.url;
      if (!rawVideoUrl && submitted.status_url) {
        const isMinimax = isMinimaxVideoStatusUrl(submitted.status_url);
        for (let attempt = 0; attempt < 24; attempt++) {
          await new Promise((r) => setTimeout(r, 3500));
          const polled = isMinimax
            ? await fetchMinimaxVideoStatus(submitted.status_url)
            : await fetchOpenRouterStatus(submitted.status_url);
          if (polled.status === "completed" && polled.video?.url) {
            rawVideoUrl = polled.video.url;
            break;
          }
          if (polled.status === "failed" || polled.status === "nsfw") {
            throw new Error(polled.error || "H3 影片渲染失敗");
          }
        }
      }

      if (rawVideoUrl) {
        await finalizeJutsuRenderedVideo(current, rawVideoUrl, {
          applyColorFix: current.applyColorFix !== false,
          keepSourceAudio: current.keepSourceAudio !== false,
        });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Scro Swap 渲染失敗";
    await col.updateOne(
      { _id: jobId },
      { $set: { status: "failed", error: msg, updatedAt: new Date() } },
    );
  }
}

/** Advance any in-flight `jutsu_jobs` (called by task polling and the refresh cron). */
export async function advanceJutsuJobs(clerkUserId?: string): Promise<number> {
  const col = await jutsuJobsCollection();
  const filter: Record<string, unknown> = { status: "rendering" };
  if (clerkUserId) filter.clerkUserId = clerkUserId;
  const active = (await col
    .find(filter)
    .sort({ updatedAt: 1 })
    .limit(12)
    .toArray()) as Array<JutsuJob & { _id: ObjectId }>;

  let advanced = 0;
  const staleCutoff = Date.now() - 25 * 60 * 1000;

  for (const job of active) {
    try {
      if (!job.openRouterStatusUrl) {
        if (job.createdAt.getTime() < staleCutoff) {
          await col.updateOne(
            { _id: job._id },
            { $set: { status: "failed", error: "Scro Swap 處理逾時，請重試", updatedAt: new Date() } },
          );
          advanced++;
        }
        continue;
      }

      const polled = isMinimaxVideoStatusUrl(job.openRouterStatusUrl)
        ? await fetchMinimaxVideoStatus(job.openRouterStatusUrl)
        : await fetchOpenRouterStatus(job.openRouterStatusUrl);

      if (polled.status === "completed" && polled.video?.url) {
        await finalizeJutsuRenderedVideo(job, polled.video.url, {
          applyColorFix: job.applyColorFix !== false,
          keepSourceAudio: job.keepSourceAudio !== false,
        });
        advanced++;
      } else if (polled.status === "failed" || polled.status === "nsfw") {
        const err = polled.error || "影片渲染失敗";
        await col.updateOne(
          { _id: job._id },
          { $set: { status: "failed", error: err, updatedAt: new Date() } },
        );
        advanced++;
      } else if (job.createdAt.getTime() < staleCutoff) {
        await col.updateOne(
          { _id: job._id },
          { $set: { status: "failed", error: "Scro Swap 渲染逾時，請重試", updatedAt: new Date() } },
        );
        advanced++;
      }
    } catch (error) {
      console.error("[scro-swap] advance failed", { jobId: job._id.toHexString(), error });
    }
  }

  return advanced;
}

/** Poll an in-progress Jutsu video job against OpenRouter status URL. */
export async function pollJutsuJobStatus(
  jobId: string,
): Promise<{ ok: true; job: PublicJutsuJob } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) {
      return { ok: false, error: "找不到 Jutsu 任務" };
    }
    const col = await jutsuJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    })) as (JutsuJob & { _id: ObjectId }) | null;
    if (!job) return { ok: false, error: "找不到 Jutsu 任務" };

    if (job.status !== "rendering" || !job.openRouterStatusUrl) {
      return { ok: true, job: toPublicJutsuJob(job) };
    }

    const polled = isMinimaxVideoStatusUrl(job.openRouterStatusUrl)
      ? await fetchMinimaxVideoStatus(job.openRouterStatusUrl)
      : await fetchOpenRouterStatus(job.openRouterStatusUrl);
    if (polled.status === "completed" && polled.video?.url) {
      return await finalizeJutsuRenderedVideo(job, polled.video.url);
    }
    if (polled.status === "failed" || polled.status === "nsfw") {
      const err = polled.error || "影片渲染失敗";
      const now = new Date();
      await col.updateOne(
        { _id: job._id },
        { $set: { status: "failed", error: err, updatedAt: now } },
      );
      return {
        ok: true,
        job: toPublicJutsuJob({ ...job, status: "failed", error: err, updatedAt: now }),
      };
    }

    return { ok: true, job: toPublicJutsuJob(job) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "查詢進度失敗",
    };
  }
}

export async function listJutsuJobs(
  clerkUserId: string,
  limit = 20,
): Promise<PublicJutsuJob[]> {
  const col = await jutsuJobsCollection();
  const docs = (await col
    .find({ clerkUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as Array<JutsuJob & { _id: ObjectId }>;
  return docs.map(toPublicJutsuJob);
}

export async function deleteJutsuJob(
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) return { ok: false, error: "找不到任務" };
    const col = await jutsuJobsCollection();
    await col.deleteOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    });
    revalidatePath("/app/jutsu");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除失敗",
    };
  }
}
