// Vast.ai Worker FFmpeg operations for Canvas `ffmpeg:*` nodes.
// Runs via system `ffmpeg` / `ffmpeg-static` (`libx264` or GPU `h264_nvenc`),
// uploads outputs to Vercel Blob, and updates `canvas_jobs` + `canvas_projects`.

import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob, CanvasNodeData } from "@/model/canvas";
import {
  createDefaultCanvasJobLedgerDeps,
  markJobCompleted,
  markJobFailed,
} from "@/service/canvas/job-ledger";
import { buildVideoCodecArgs } from "@/service/ffmpeg/video-encoder";
import { persistBuffer } from "@/service/higgsfield/persist";
import { applyJutsuColorGradeBuffer, DEFAULT_JUTSU_COLOR_SETTINGS } from "@/service/jutsu/color-grade";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { gradeTalkingHeadSensorTextureBuffer } from "@/service/style/realistic-grade";
import { trimClipSmoothSilence } from "@/service/voice/smooth-silence";
import { buildEditFfmpegArgs, burnSubtitleAss } from "@/service/canvas/ffmpeg-edit";

export type CanvasFfmpegLocalInputs = {
  videoFiles: string[];
  audioFile?: string;
  imageFile?: string;
  overlayVideoFile?: string;
  subtitleFile?: string;
  hasAudioByVideo: boolean[];
  durationsSec?: number[];
  targetWidth?: number;
  targetHeight?: number;
  // cropdetect result, "w:h:x:y", for the letterbox crop node.
  detectedCrop?: string;
};

function numParam(snapshot: Record<string, unknown>, key: string, fallback: number): number {
  const tp = snapshot.toolParams as Record<string, unknown> | undefined;
  const raw = tp?.[key] ?? snapshot[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

function strParam(snapshot: Record<string, unknown>, key: string, fallback: string): string {
  const tp = snapshot.toolParams as Record<string, unknown> | undefined;
  const raw = tp?.[key] ?? snapshot[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

function boolParam(snapshot: Record<string, unknown>, key: string, fallback = false): boolean {
  const tp = snapshot.toolParams as Record<string, unknown> | undefined;
  const raw = tp?.[key] ?? snapshot[key];
  return typeof raw === "boolean" ? raw : fallback;
}

export function parseMediaProbe(stderr: string): {
  hasAudio: boolean;
  durationSec: number;
  width?: number;
  height?: number;
} {
  const hasAudio = /Stream\s+#\d+:\d+.*Audio:/i.test(stderr);
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  let durationSec = 5;
  if (durMatch) {
    durationSec =
      Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]);
    if (!Number.isFinite(durationSec) || durationSec <= 0) durationSec = 5;
  }
  const dimMatch = stderr.match(/Stream\s+#\d+:\d+.*Video:.*?,\s*(\d{2,5})x(\d{2,5})\b/i);
  return {
    hasAudio,
    durationSec,
    ...(dimMatch ? { width: Number(dimMatch[1]), height: Number(dimMatch[2]) } : {}),
  };
}

function targetDimsForAspect(aspect: string): { width: number; height: number } {
  if (aspect === "16:9") return { width: 1920, height: 1080 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

export function buildCanvasFfmpegArgs(
  modelId: string,
  snapshot: Record<string, unknown>,
  localInputs: CanvasFfmpegLocalInputs,
  outputFile: string,
): string[] {
  const edited = buildEditFfmpegArgs(modelId, snapshot, localInputs, outputFile);
  if (edited) return edited;
  const codecArgs = buildVideoCodecArgs({ pixFmt: "yuv420p" });

  if (modelId === "ffmpeg:concat") {
    const n = localInputs.videoFiles.length;
    if (n === 0) throw new Error("FFmpeg Concat 至少需要 1 段輸入影片");
    const transition = strParam(
      snapshot,
      "ffmpegTransition",
      strParam(snapshot, "presetId", "pad-200ms"),
    );
    const width = localInputs.targetWidth ?? 1080;
    const height = localInputs.targetHeight ?? 1920;

    const args: string[] = ["-y"];
    for (const file of localInputs.videoFiles) {
      args.push("-i", file);
    }

    const filters: string[] = [];
    const durations = localInputs.videoFiles.map(
      (_, i) => Math.max(0.5, localInputs.durationsSec?.[i] ?? 5),
    );

    for (let i = 0; i < n; i += 1) {
      const padStep =
        transition === "pad-200ms" && i < n - 1
          ? ",tpad=stop_mode=clone:stop_duration=0.2"
          : "";
      filters.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS${padStep}[v${i}]`,
      );
      if (localInputs.hasAudioByVideo[i]) {
        const audioPad =
          transition === "pad-200ms" && i < n - 1 ? ",apad=pad_dur=0.2" : "";
        filters.push(
          `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS${audioPad}[a${i}]`,
        );
      } else {
        const dur = durations[i]! + (transition === "pad-200ms" && i < n - 1 ? 0.2 : 0);
        filters.push(`anullsrc=r=44100:cl=stereo:d=${dur.toFixed(3)}[a${i}]`);
      }
    }

    if (transition === "fade" && n >= 2) {
      const fadeDur = 0.35;
      let prevV = "v0";
      let prevA = "a0";
      let offset = Math.max(0.2, durations[0]! - fadeDur);
      for (let i = 1; i < n; i += 1) {
        const outV = i === n - 1 ? "vout" : `xv${i}`;
        const outA = i === n - 1 ? "aout" : `xa${i}`;
        filters.push(
          `[${prevV}][v${i}]xfade=transition=fade:duration=${fadeDur}:offset=${offset.toFixed(3)}[${outV}]`,
        );
        filters.push(
          `[${prevA}][a${i}]acrossfade=d=${fadeDur}[${outA}]`,
        );
        prevV = outV;
        prevA = outA;
        offset += Math.max(0.2, durations[i]! - fadeDur);
      }
    } else {
      const pairs = localInputs.videoFiles.map((_, i) => `[v${i}][a${i}]`).join("");
      filters.push(`${pairs}concat=n=${n}:v=1:a=1[vout][aout]`);
    }

    args.push(
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      ...codecArgs,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outputFile,
    );
    return args;
  }

  if (modelId === "ffmpeg:audio-mux") {
    const videoFile = localInputs.videoFiles[0];
    const audioFile = localInputs.audioFile;
    if (!videoFile || !audioFile) {
      throw new Error("FFmpeg Audio Mux 需要輸入影片與音訊");
    }
    const mixMode = strParam(
      snapshot,
      "ffmpegMixMode",
      strParam(snapshot, "presetId", "replace"),
    );
    const gainDb = Math.min(12, Math.max(-24, numParam(snapshot, "ffmpegAudioGainDb", 0)));
    const hasSrcAudio = Boolean(localInputs.hasAudioByVideo[0]);

    if (mixMode === "mix-ducking" && hasSrcAudio) {
      return [
        "-y",
        "-i",
        videoFile,
        "-i",
        audioFile,
        "-filter_complex",
        `[1:a]volume=${gainDb}dB,asplit=2[vo_sc][vo_mix];[0:a][vo_sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=250[ducked];[ducked][vo_mix]amix=inputs=2:duration=first:normalize=0[aout]`,
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        outputFile,
      ];
    }

    return [
      "-y",
      "-i",
      videoFile,
      "-i",
      audioFile,
      "-filter_complex",
      `[1:a]volume=${gainDb}dB[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputFile,
    ];
  }

  if (modelId === "ffmpeg:trim-speed") {
    const videoFile = localInputs.videoFiles[0];
    if (!videoFile) throw new Error("FFmpeg Trim & Speed 需要輸入影片");
    const startSec = Math.max(0, numParam(snapshot, "ffmpegStartSec", 0));
    const endSec = numParam(snapshot, "ffmpegEndSec", 0);
    const speed = Math.min(2, Math.max(0.5, numParam(snapshot, "ffmpegSpeed", 1)));
    const hasAudio = Boolean(localInputs.hasAudioByVideo[0]);

    const args: string[] = ["-y"];
    if (startSec > 0) args.push("-ss", String(startSec));
    if (endSec > startSec) args.push("-to", String(endSec));
    args.push("-i", videoFile);

    if (Math.abs(speed - 1) >= 0.01) {
      args.push("-filter:v", `setpts=PTS/${speed}`);
      if (hasAudio) {
        args.push("-filter:a", `atempo=${speed}`);
      } else {
        args.push("-an");
      }
    } else if (!hasAudio) {
      args.push("-an");
    }

    args.push(...codecArgs);
    if (hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
    args.push("-movflags", "+faststart", outputFile);
    return args;
  }

  if (modelId === "ffmpeg:transform") {
    const videoFile = localInputs.videoFiles[0];
    if (!videoFile) throw new Error("FFmpeg Transform 需要輸入影片");
    const aspect = strParam(snapshot, "aspectRatio", strParam(snapshot, "presetId", "9:16"));
    const cropMode = strParam(snapshot, "ffmpegCropMode", "center-crop");
    const { width, height } = targetDimsForAspect(aspect);
    const hasAudio = Boolean(localInputs.hasAudioByVideo[0]);

    const vf =
      cropMode === "fit-pad"
        ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`
        : `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1`;

    return [
      "-y",
      "-i",
      videoFile,
      "-vf",
      vf,
      ...codecArgs,
      ...(hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : ["-an"]),
      "-movflags",
      "+faststart",
      outputFile,
    ];
  }

  if (modelId === "ffmpeg:extract-audio") {
    const videoFile = localInputs.videoFiles[0];
    if (!videoFile) throw new Error("FFmpeg Extract Audio 需要輸入影片");
    return [
      "-y",
      "-i",
      videoFile,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "192k",
      outputFile,
    ];
  }

  if (modelId === "ffmpeg:color-grade" || modelId === "ffmpeg:smooth-silence") {
    const videoFile = localInputs.videoFiles[0];
    if (!videoFile) throw new Error("需要輸入影片");
    // Post-only ops: copy here, then the grade / silence trim runs on the output buffer.
    return ["-y", "-i", videoFile, "-c", "copy", outputFile];
  }

  throw new Error(`不支援的 FFmpeg 節點：${modelId}`);
}

export type ExecuteCanvasFfmpegDeps = {
  findCanvasJob: (jobId: ObjectId) => Promise<CanvasJob | null>;
  downloadToFile: (url: string, dest: string) => Promise<void>;
  probeStderr: (dir: string, fileName: string) => Promise<string>;
  runFfmpeg: (dir: string, args: string[]) => Promise<void>;
  trimSilence: (buffer: Buffer) => Promise<Buffer>;
  applyColorGrade: (buffer: Buffer) => Promise<Buffer>;
  gradeTalkingHead: (buffer: Buffer, options?: { handheldSelfie?: boolean }) => Promise<Buffer>;
  persistBuffer: (buffer: Buffer, pathname: string, contentType: string) => Promise<string>;
  updateCanvasJob: (
    jobId: ObjectId,
    clerkUserId: string,
    update: { $set?: Partial<CanvasJob>; $unset?: Partial<Record<keyof CanvasJob, "" | 1>> },
  ) => Promise<void>;
  updateCanvasNodeState: (params: {
    canvasId: ObjectId;
    clerkUserId: string;
    nodeId: string;
    patch: Partial<CanvasNodeData>;
    thumbnailUrl?: string;
    updatedAt: Date;
  }) => Promise<void>;
  now?: () => Date;
};

function ffmpegOutputFile(modelId: string): {
  file: string;
  kind: "video" | "audio" | "image";
  contentType: string;
  ext: string;
} {
  if (modelId === "ffmpeg:extract-audio") {
    return { file: "output.mp3", kind: "audio", contentType: "audio/mpeg", ext: "mp3" };
  }
  if (modelId === "ffmpeg:frame-grab") {
    return { file: "output.jpg", kind: "image", contentType: "image/jpeg", ext: "jpg" };
  }
  return { file: "output.mp4", kind: "video", contentType: "video/mp4", ext: "mp4" };
}

async function defaultDownloadToFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) {
    throw new Error(`無法下載輸入媒體（HTTP ${response.status}）`);
  }
  await pipeline(Readable.fromWeb(response.body as WebReadableStream), createWriteStream(dest));
}

export async function executeCanvasFfmpegJob(
  jobId: ObjectId,
  deps?: Partial<ExecuteCanvasFfmpegDeps>,
): Promise<{ outcome: "completed"; outputUrl: string } | { outcome: "failed"; error: string }> {
  const defaultLedger = createDefaultCanvasJobLedgerDeps();
  const resolved: ExecuteCanvasFfmpegDeps = {
    findCanvasJob: async (id) => {
      const col = await canvasJobsCollection();
      return col.findOne({ _id: id });
    },
    downloadToFile: defaultDownloadToFile,
    probeStderr: (dir, fileName) => ffmpegStderr(dir, ["-i", fileName]),
    runFfmpeg: (dir, args) => runFfmpeg(dir, args),
    trimSilence: (buffer) => trimClipSmoothSilence(buffer),
    applyColorGrade: (buffer) =>
      applyJutsuColorGradeBuffer(buffer, DEFAULT_JUTSU_COLOR_SETTINGS),
    gradeTalkingHead: (buffer, options) => gradeTalkingHeadSensorTextureBuffer(buffer, options),
    persistBuffer,
    updateCanvasJob: defaultLedger.updateCanvasJob,
    updateCanvasNodeState: defaultLedger.updateCanvasNodeState,
    now: defaultLedger.now,
    ...deps,
  };

  const job = await resolved.findCanvasJob(jobId);
  if (!job) {
    return { outcome: "failed", error: "找不到對應的 Canvas FFmpeg 任務" };
  }

  const jobIdHex = job._id.toHexString();
  const dir = await mkdtemp(join(tmpdir(), "canvas-ffmpeg-"));
  try {
    const snapshot = job.inputSnapshot ?? {};
    const videoUrls = Array.isArray(snapshot.videos)
      ? (snapshot.videos as string[])
      : typeof snapshot.video === "string" && snapshot.video
        ? [snapshot.video]
        : [];
    const audioUrl = typeof snapshot.refAudio === "string" ? snapshot.refAudio : undefined;
    const imageUrl = typeof snapshot.image === "string" ? snapshot.image : undefined;
    const overlayVideoUrl = typeof snapshot.overlayVideo === "string" ? snapshot.overlayVideo : undefined;

    const videoFiles: string[] = [];
    const hasAudioByVideo: boolean[] = [];
    const durationsSec: number[] = [];
    let firstWidth: number | undefined;
    let firstHeight: number | undefined;

    for (let i = 0; i < videoUrls.length; i += 1) {
      const name = `in-${i}.mp4`;
      await resolved.downloadToFile(videoUrls[i]!, join(dir, name));
      const probeStr = await resolved.probeStderr(dir, name);
      const probed = parseMediaProbe(probeStr);
      videoFiles.push(name);
      hasAudioByVideo.push(probed.hasAudio);
      durationsSec.push(probed.durationSec);
      if (i === 0) {
        firstWidth = probed.width;
        firstHeight = probed.height;
      }
    }

    let audioFile: string | undefined;
    if (audioUrl) {
      audioFile = "in-audio.mp3";
      await resolved.downloadToFile(audioUrl, join(dir, audioFile));
    }

    let imageFile: string | undefined;
    if (imageUrl) {
      const lower = imageUrl.toLowerCase();
      const ext = lower.includes(".png") ? "png" : lower.includes(".webp") ? "webp" : "jpg";
      imageFile = `in-image.${ext}`;
      await resolved.downloadToFile(imageUrl, join(dir, imageFile));
    }

    let overlayVideoFile: string | undefined;
    if (overlayVideoUrl) {
      overlayVideoFile = "overlay.mp4";
      await resolved.downloadToFile(overlayVideoUrl, join(dir, overlayVideoFile));
    }

    if (job.modelId === "ffmpeg:extract-audio" && !hasAudioByVideo[0]) {
      throw new Error("來源影片沒有音訊軌道，無法抽取音訊");
    }

    let detectedCrop: string | undefined;
    const cropMode = strParam(snapshot, "ffmpegCropMode", strParam(snapshot, "presetId", ""));
    if (job.modelId === "ffmpeg:crop" && cropMode === "letterbox" && videoFiles[0]) {
      const detect = await ffmpegStderr(dir, [
        "-i",
        videoFiles[0],
        "-vf",
        "cropdetect=24:16:0",
        "-f",
        "null",
        "-",
      ]);
      const last = [...detect.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)].at(-1)?.[1];
      const full = firstWidth && firstHeight ? `${firstWidth}:${firstHeight}:0:0` : "";
      if (last && last !== full) detectedCrop = last;
    }

    const produced = ffmpegOutputFile(job.modelId);
    const localInputs: CanvasFfmpegLocalInputs = {
      videoFiles,
      audioFile,
      imageFile,
      overlayVideoFile,
      hasAudioByVideo,
      durationsSec,
      targetWidth: firstWidth,
      targetHeight: firstHeight,
      detectedCrop,
    };
    if (job.modelId === "ffmpeg:burn-subtitles") {
      await writeFile(join(dir, "subs.ass"), burnSubtitleAss(snapshot, localInputs), "utf8");
      localInputs.subtitleFile = "subs.ass";
    }

    const args = buildCanvasFfmpegArgs(job.modelId, snapshot, localInputs, produced.file);

    await resolved.runFfmpeg(dir, args);
    let outBuf: Buffer = await readFile(join(dir, produced.file));

    if (job.modelId === "ffmpeg:trim-speed" && boolParam(snapshot, "ffmpegTrimSilence", false)) {
      outBuf = Buffer.from(await resolved.trimSilence(outBuf));
    }
    if (
      job.modelId === "ffmpeg:transform" &&
      strParam(snapshot, "ffmpegColorGrade", "none") === "h3-soft"
    ) {
      outBuf = Buffer.from(await resolved.applyColorGrade(outBuf));
    }
    if (job.modelId === "ffmpeg:smooth-silence") {
      outBuf = Buffer.from(await resolved.trimSilence(outBuf));
    }
    if (job.modelId === "ffmpeg:color-grade") {
      const look = strParam(snapshot, "gradeLook", strParam(snapshot, "presetId", "jutsu"));
      outBuf = Buffer.from(
        look === "jutsu"
          ? await resolved.applyColorGrade(outBuf)
          : await resolved.gradeTalkingHead(outBuf, {
              handheldSelfie: look === "talking-head-selfie",
            }),
      );
    }

    const outputUrl = await resolved.persistBuffer(
      outBuf,
      `canvas/${job.clerkUserId}/${jobIdHex}.${produced.ext}`,
      produced.contentType,
    );

    await markJobCompleted(
      job,
      {
        outputUrl,
        outputKind: produced.kind,
        includeCostInPatch: false,
      },
      {
        updateCanvasJob: resolved.updateCanvasJob,
        updateCanvasNodeState: resolved.updateCanvasNodeState,
        now: resolved.now,
      },
    );

    return { outcome: "completed", outputUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FFmpeg 處理失敗";
    await markJobFailed(
      job,
      message,
      {
        updateCanvasJob: resolved.updateCanvasJob,
        updateCanvasNodeState: resolved.updateCanvasNodeState,
        now: resolved.now,
      },
      { skipRefund: true, includeCostInPatch: false },
    );
    return { outcome: "failed", error: message };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
