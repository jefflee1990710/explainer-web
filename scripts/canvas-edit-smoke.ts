// Local effect check for the canvas edit nodes. Writes one folder of outputs and prints a line per node.
// Auto captions calls ElevenLabs Scribe once on a short Cantonese clip.

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { transcribeCaptionVideo } from "@/service/canvas/execution/caption-transcribe";
import { buildCanvasFfmpegArgs, parseMediaProbe } from "@/service/canvas/execution/ffmpeg-ops";
import type { CanvasFfmpegLocalInputs } from "@/service/canvas/execution/ffmpeg-ops";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

loadEnvConfig(process.cwd());

const outDir = join(tmpdir(), "canvas-edit-smoke");

async function probe(file: string) {
  const stderr = await ffmpegStderr(outDir, ["-i", file]);
  const parsed = parseMediaProbe(stderr);
  if (parsed.durationSec === undefined) throw new Error(`${file}: no duration`);
  return { ...parsed, durationSec: parsed.durationSec };
}

async function frame(video: string, jpg: string, at = "0.4") {
  await runFfmpeg(outDir, ["-y", "-ss", at, "-i", video, "-frames:v", "1", "-q:v", "3", jpg]);
}

async function render(
  modelId: string,
  snapshot: Record<string, unknown>,
  local: CanvasFfmpegLocalInputs,
  file: string,
) {
  const args = buildCanvasFfmpegArgs(modelId, snapshot, local, file);
  await runFfmpeg(outDir, args);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await runFfmpeg(outDir, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=30:duration=4",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100:duration=4",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "base.mp4",
  ]);
  await runFfmpeg(outDir, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=30:duration=4",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=4",
    "-vf",
    "pad=640:480:0:60:black",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "bars.mp4",
  ]);
  await runFfmpeg(outDir, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x22c55e:size=240x240:rate=1",
    "-frames:v",
    "1",
    "logo.png",
  ]);
  await runFfmpeg(outDir, ["-y", "-i", "base.mp4", "-ss", "0.2", "-frames:v", "1", "still.png"]);

  const base = await probe("base.mp4");
  const videoLocal = {
    videoFiles: ["base.mp4"],
    hasAudioByVideo: [true],
    durationsSec: [base.durationSec],
    targetWidth: base.width,
    targetHeight: base.height,
  };

  const report: string[] = [];
  const note = async (name: string, file: string, detail: string) => {
    report.push(`${name}\t${file}\t${detail}`);
    console.log(`OK ${name}: ${detail}`);
  };

  await render("ffmpeg:keep-ranges", { toolParams: { ffmpegRanges: "0-1, 3-4" } }, videoLocal, "keep.mp4");
  const kept = await probe("keep.mp4");
  await frame("keep.mp4", "keep.jpg", "0.3");
  await note("keep-ranges", "keep.mp4", `duration ${kept.durationSec.toFixed(2)}s (expect ~2s) ${kept.width}x${kept.height}`);

  await render("ffmpeg:volume", { toolParams: { ffmpegVolumeMode: "gain", ffmpegAudioGainDb: 6 } }, videoLocal, "volume.mp4");
  await note("volume", "volume.mp4", `duration ${(await probe("volume.mp4")).durationSec.toFixed(2)}s gain +6dB`);

  await render("ffmpeg:volume", { toolParams: { ffmpegVolumeMode: "mute" } }, videoLocal, "mute.mp4");
  const muteLog = await ffmpegStderr(outDir, ["-i", "mute.mp4", "-af", "volumedetect", "-f", "null", "-"]);
  const mean = muteLog.match(/mean_volume:\s*([-\d.]+|inf|-inf)/i)?.[1] ?? "unknown";
  await note("volume-mute", "mute.mp4", `mean_volume ${mean} dB`);

  await render("ffmpeg:volume", { toolParams: { ffmpegVolumeMode: "loudnorm" } }, videoLocal, "loud.mp4");
  await note("volume-loudnorm", "loud.mp4", `duration ${(await probe("loud.mp4")).durationSec.toFixed(2)}s`);

  await render(
    "ffmpeg:audio-fade",
    { toolParams: { ffmpegFadeInSec: 0.3, ffmpegFadeOutSec: 0.4 } },
    videoLocal,
    "audio-fade.mp4",
  );
  await note("audio-fade", "audio-fade.mp4", `duration ${(await probe("audio-fade.mp4")).durationSec.toFixed(2)}s`);

  await render("ffmpeg:fade", { toolParams: { ffmpegFadeInSec: 0.4, ffmpegFadeOutSec: 0.4 } }, videoLocal, "fade.mp4");
  await frame("fade.mp4", "fade.jpg", "0.1");
  await note("fade", "fade.mp4", `duration ${(await probe("fade.mp4")).durationSec.toFixed(2)}s frame at 0.1s should be dark`);

  await render(
    "ffmpeg:crop",
    { toolParams: { ffmpegCropMode: "custom", ffmpegCropX: 80, ffmpegCropY: 40, ffmpegCropW: 320, ffmpegCropH: 180 } },
    videoLocal,
    "crop.mp4",
  );
  const cropped = await probe("crop.mp4");
  await frame("crop.mp4", "crop.jpg", "0.5");
  await note("crop", "crop.mp4", `${cropped.width}x${cropped.height} (expect 320x180)`);

  const bars = await probe("bars.mp4");
  const detect = await ffmpegStderr(outDir, ["-i", "bars.mp4", "-vf", "cropdetect=24:16:0", "-f", "null", "-"]);
  const detected = [...detect.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)].at(-1)?.[1];
  await render(
    "ffmpeg:crop",
    { toolParams: { ffmpegCropMode: "letterbox" } },
    {
      videoFiles: ["bars.mp4"],
      hasAudioByVideo: [true],
      durationsSec: [bars.durationSec],
      targetWidth: bars.width,
      targetHeight: bars.height,
      detectedCrop: detected,
    },
    "letterbox.mp4",
  );
  const letter = await probe("letterbox.mp4");
  await note("crop-letterbox", "letterbox.mp4", `detected ${detected} -> ${letter.width}x${letter.height}`);

  await render("ffmpeg:rotate", { toolParams: { ffmpegRotate: "90" } }, videoLocal, "rotate.mp4");
  const rotated = await probe("rotate.mp4");
  await frame("rotate.mp4", "rotate.jpg", "0.4");
  await note("rotate", "rotate.mp4", `${rotated.width}x${rotated.height} (expect 360x640)`);

  await render(
    "ffmpeg:overlay",
    { toolParams: { ffmpegOverlayPosition: "bottom-right", ffmpegOverlayOpacity: 0.85 } },
    { ...videoLocal, imageFile: "logo.png" },
    "overlay.mp4",
  );
  await frame("overlay.mp4", "overlay.jpg", "0.5");
  await note("overlay", "overlay.mp4", `${(await probe("overlay.mp4")).width}x${(await probe("overlay.mp4")).height} green mark bottom-right`);

  await render(
    "ffmpeg:image-to-video",
    { aspectRatio: "16:9", toolParams: { ffmpegDurationSec: 2, ffmpegKenBurns: true } },
    { videoFiles: [], hasAudioByVideo: [], imageFile: "still.png" },
    "still.mp4",
  );
  const still = await probe("still.mp4");
  await frame("still.mp4", "still.jpg", "0.2");
  await note("image-to-video", "still.mp4", `${still.durationSec.toFixed(2)}s ${still.width}x${still.height} audio=${still.hasAudio}`);

  await render("ffmpeg:frame-grab", { toolParams: { ffmpegAtSec: 1.2 } }, videoLocal, "grab.jpg");
  const grab = await readFile(join(outDir, "grab.jpg"));
  await note("frame-grab", "grab.jpg", `${grab.length} bytes`);

  const sampleSrt = "1\n00:00:00,200 --> 00:00:03,500\n你好，字幕測試\n";
  await writeFile(join(outDir, "subs.ass"), "");
  const { burnSubtitleAss } = await import("@/service/canvas/execution/ffmpeg-edit");
  await writeFile(
    join(outDir, "subs.ass"),
    burnSubtitleAss({ prompt: sampleSrt }, videoLocal),
    "utf8",
  );
  await render(
    "ffmpeg:burn-subtitles",
    { prompt: sampleSrt },
    { ...videoLocal, subtitleFile: "subs.ass" },
    "burn.mp4",
  );
  await frame("burn.mp4", "burn.jpg", "1.0");
  await note("burn-subtitles", "burn.mp4", "manual SRT 你好，字幕測試");

  const speechAiff = join(outDir, "speech.aiff");
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("say", ["-v", "Sinji", "-o", speechAiff, "你好，這是字幕測試，今日天氣好好。"], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`say exited ${code}`))));
  });
  await runFfmpeg(outDir, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=30:duration=4",
    "-i",
    "speech.aiff",
    "-shortest",
    "-pix_fmt",
    "yuv420p",
    "spoken.mp4",
  ]);
  const transcribed = await transcribeCaptionVideo(
    { videoUrl: "spoken.mp4", language: "yue", pathname: "captions.srt" },
    {
      downloadToFile: async (_url, dest) => {
        await copyFile(join(outDir, "spoken.mp4"), dest);
      },
      persistSrt: async (buffer) => {
        const file = join(outDir, "captions.srt");
        await writeFile(file, buffer);
        return file;
      },
    },
  );
  await writeFile(join(outDir, "spoken-subs.ass"), burnSubtitleAss({ prompt: transcribed.srt }, {
    ...videoLocal,
    videoFiles: ["spoken.mp4"],
    durationsSec: [transcribed.durationSec],
  }), "utf8");
  const spokenProbe = await probe("spoken.mp4");
  await render(
    "ffmpeg:burn-subtitles",
    { prompt: transcribed.srt },
    {
      videoFiles: ["spoken.mp4"],
      hasAudioByVideo: [spokenProbe.hasAudio],
      durationsSec: [spokenProbe.durationSec],
      targetWidth: spokenProbe.width,
      targetHeight: spokenProbe.height,
      subtitleFile: "spoken-subs.ass",
    },
    "spoken-burn.mp4",
  );
  await frame("spoken-burn.mp4", "spoken-burn.jpg", "1.0");
  await note("auto-captions", "captions.srt", transcribed.srt.replace(/\s+/g, " ").slice(0, 240));
  await note("burn-detected", "spoken-burn.mp4", "burned the detected SRT");

  await writeFile(join(outDir, "report.tsv"), report.join("\n") + "\n", "utf8");
  console.log(`WROTE ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
