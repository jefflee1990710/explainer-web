// Local effect check for the newer canvas edit nodes (no paid calls). Renders each node on
// generated test clips with the real ffmpeg and prints length, size, and sound per output.
// Run: npx tsx scripts/canvas-edit-smoke-more.ts

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCanvasFfmpegArgs, parseMediaProbe } from "@/service/canvas/execution/ffmpeg-ops";
import type { CanvasFfmpegLocalInputs } from "@/service/canvas/execution/ffmpeg-ops";
import { burnSubtitleAss } from "@/service/canvas/execution/ffmpeg-edit";
import { textOverlayAss } from "@/service/canvas/execution/ffmpeg-edit-more";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

const outDir = join(tmpdir(), "canvas-edit-smoke-more");

async function probe(file: string) {
  return parseMediaProbe(await ffmpegStderr(outDir, ["-i", file]));
}

async function frame(video: string, jpg: string, at: number) {
  await runFfmpeg(outDir, ["-y", "-ss", String(at), "-i", video, "-frames:v", "1", "-q:v", "3", jpg]);
}

async function render(modelId: string, toolParams: Record<string, unknown>, local: CanvasFfmpegLocalInputs, file: string) {
  await runFfmpeg(outDir, buildCanvasFfmpegArgs(modelId, { toolParams }, local, file));
  const p = await probe(file);
  console.log(`OK ${modelId.padEnd(22)} ${file.padEnd(18)} ${p.durationSec?.toFixed(2) ?? "?"}s ${p.width ?? "-"}x${p.height ?? "-"} audio=${p.hasAudio}`);
  return p;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const lavfi = (spec: string) => ["-f", "lavfi", "-i", spec];
  await runFfmpeg(outDir, ["-y", ...lavfi("testsrc2=size=720x1280:rate=30:duration=6"), ...lavfi("sine=frequency=300:duration=6"), "-shortest", "-pix_fmt", "yuv420p", "a.mp4"]);
  await runFfmpeg(outDir, ["-y", ...lavfi("smptebars=size=1280x720:rate=30:duration=4"), ...lavfi("sine=frequency=600:duration=4"), "-shortest", "-pix_fmt", "yuv420p", "wide.mp4"]);
  await runFfmpeg(outDir, ["-y", ...lavfi("color=c=0x00FF00:size=400x400:rate=30:duration=6"), ...lavfi("color=c=red:size=160x160:rate=30:duration=6"), "-filter_complex", "[0:v][1:v]overlay=120:120", "-pix_fmt", "yuv420p", "green.mp4"]);
  await runFfmpeg(outDir, ["-y", ...lavfi("sine=frequency=880:duration=3"), "-c:a", "libmp3lame", "music.mp3"]);
  await runFfmpeg(outDir, ["-y", ...lavfi("sine=frequency=220:duration=2"), "-c:a", "libmp3lame", "tone.mp3"]);

  const a: CanvasFfmpegLocalInputs = { videoFiles: ["a.mp4"], hasAudioByVideo: [true], durationsSec: [6], targetWidth: 720, targetHeight: 1280 };

  await render("ffmpeg:split", { ffmpegAtSec: 2.5 }, a, "split.mp4");
  const partB = await probe("split-video-b.mp4");
  console.log(`   part B ${partB.durationSec?.toFixed(2)}s audio=${partB.hasAudio}`);

  const textParams = { ffmpegText: "開場標題\\n第二行 Title", ffmpegTextPosition: "center", ffmpegTextSizePct: 6, ffmpegTextColor: "yellow", ffmpegTextBox: true, ffmpegTextStartSec: 1, ffmpegTextEndSec: 4 };
  await writeFile(join(outDir, "text.ass"), textOverlayAss({ toolParams: textParams }, a), "utf8");
  await render("ffmpeg:text", textParams, { ...a, subtitleFile: "text.ass" }, "text.mp4");
  await frame("text.mp4", "text.jpg", 2);

  await render("ffmpeg:audio-mix", { ffmpegBgmVolumeDb: -12, ffmpegBgmStartSec: 0.5, ffmpegBgmFadeOutSec: 1 }, { ...a, audioFile: "music.mp3", audioDurationSec: 3 }, "bgm.mp4");
  await render("ffmpeg:audio-trim", { ffmpegStartSec: 0.5, ffmpegEndSec: 2.5, ffmpegAudioGainDb: -6, ffmpegFadeInSec: 0.3, ffmpegFadeOutSec: 0.5 }, { videoFiles: [], hasAudioByVideo: [], audioFile: "music.mp3", audioDurationSec: 3 }, "trim.mp3");
  await render("ffmpeg:audio-concat", { ffmpegGapSec: 0.5 }, { videoFiles: [], hasAudioByVideo: [], audioFiles: ["music.mp3", "tone.mp3"] }, "joined.mp3");
  await render("ffmpeg:adjust", { ffmpegBrightness: 0.08, ffmpegContrast: 1.2, ffmpegSaturation: 0.2, ffmpegTemperatureK: 9000, ffmpegVignette: true }, a, "adjust.mp4");
  await frame("adjust.mp4", "adjust.jpg", 1);
  await render("ffmpeg:freeze", { ffmpegAtSec: 2, ffmpegDurationSec: 1.5 }, a, "freeze.mp4");
  await render("ffmpeg:freeze", { ffmpegAtSec: 0, ffmpegDurationSec: 1 }, a, "freeze0.mp4");
  await render("ffmpeg:export", { ffmpegResolution: "720p", ffmpegFps: "24", ffmpegQuality: "small", ffmpegLoudnorm: true }, a, "export.mp4");
  await render("ffmpeg:export", { ffmpegFormat: "webm", ffmpegResolution: "720p" }, a, "export.webm");
  await render("ffmpeg:export", { ffmpegFormat: "gif" }, a, "export.gif");

  const two: CanvasFfmpegLocalInputs = { videoFiles: ["a.mp4", "wide.mp4"], hasAudioByVideo: [true, true], durationsSec: [6, 4], targetWidth: 720, targetHeight: 1280 };
  await render("ffmpeg:concat", { ffmpegTransition: "wipeleft", ffmpegTransitionSec: 0.8 }, two, "concat-wipe.mp4");
  await render("ffmpeg:concat", { ffmpegTransition: "dissolve", ffmpegAspect: "16:9" }, two, "concat-169.mp4");
  await render("ffmpeg:keep-ranges", { ffmpegRanges: "1-2, 4-5", ffmpegRangeMode: "remove" }, a, "cut.mp4");
  await render("ffmpeg:trim-speed", { ffmpegStartSec: 1, ffmpegEndSec: 5, ffmpegSpeed: 0.25, ffmpegReverse: true }, a, "slow-rev.mp4");
  await render("ffmpeg:trim-speed", { ffmpegSpeed: 4 }, a, "fast.mp4");
  await render("ffmpeg:rotate", { ffmpegRotate: "hflip" }, a, "flip.mp4");
  await render("ffmpeg:transform", { ffmpegResolution: "720p" }, { ...a, videoFiles: ["wide.mp4"] }, "t720.mp4");
  await render("ffmpeg:overlay", { ffmpegOverlayPosition: "custom", ffmpegOverlayX: 10, ffmpegOverlayY: 60, ffmpegOverlaySizePct: 50, ffmpegChromaKey: "green", ffmpegOverlayStartSec: 1, ffmpegOverlayEndSec: 5 }, { ...a, overlayVideoFile: "green.mp4" }, "key.mp4");
  await frame("key.mp4", "key.jpg", 2);

  const srt = "1\n00:00:00,200 --> 00:00:03,500\n霓虹字幕測試\n";
  await writeFile(join(outDir, "subs.ass"), burnSubtitleAss({ prompt: srt, toolParams: { subtitleLook: "neon", ffmpegSubtitlePosition: "top" } }, a), "utf8");
  await runFfmpeg(outDir, buildCanvasFfmpegArgs("ffmpeg:burn-subtitles", { prompt: srt }, { ...a, subtitleFile: "subs.ass" }, "burn.mp4"));
  await frame("burn.mp4", "burn.jpg", 1);
  console.log(`WROTE ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
