// Clean Speech node: Scribe word timings → cut fillers, restarted phrases, and long pauses,
// then render the kept ranges with the ffmpeg:keep-ranges filter and save the mp4.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildVideoCodecArgs } from "@/service/ffmpeg/video-encoder";
import { persistBuffer } from "@/service/higgsfield/persist";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { scribeAudio } from "@/service/canvas/execution/caption-transcribe";
import { assertAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { isUsableProbe, mediaMetaFromProbe, parseMediaProbe } from "@/service/canvas/core/media-meta";
import type { CanvasMediaMeta } from "@/model/canvas";
import type { CaptionLanguage, ScribeWord } from "@/service/canvas/core/captions";
import { applyCaptionScript } from "@/service/canvas/execution/caption-traditional";
import {
  planSpeechCuts,
  speechCutReport,
  type SpeechCutOptions,
} from "@/service/canvas/core/speech-cuts";
import type { TimeRange } from "@/service/canvas/core/edit-ranges";

export type CleanSpeechDeps = {
  downloadToFile: (url: string, dest: string) => Promise<void>;
  probe: (dir: string, file: string) => Promise<string>;
  run: (dir: string, args: string[]) => Promise<void>;
  transcribe: (audio: Buffer, language: CaptionLanguage) => Promise<{ words: ScribeWord[] }>;
  persist: (buffer: Buffer, pathname: string) => Promise<string>;
};

const TIMEOUT_MS = 15 * 60_000;

function defaultDeps(): CleanSpeechDeps {
  return {
    downloadToFile: async (url, dest) => {
      assertAllowedCanvasMediaUrl(url);
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: "error" });
      if (!res.ok) throw new Error(`無法下載影片（HTTP ${res.status}）`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    },
    probe: (dir, file) => ffmpegStderr(dir, ["-i", file], 60_000),
    run: (dir, args) => runFfmpeg(dir, args, TIMEOUT_MS),
    transcribe: (audio, language) => scribeAudio(audio, language),
    persist: (buffer, pathname) => persistBuffer(buffer, pathname, "video/mp4"),
  };
}

// trim + concat over the kept ranges; silent sources get a matching silent track.
export function keepRangesArgs(keep: readonly TimeRange[], hasAudio: boolean, outputFile: string): string[] {
  const filters: string[] = [];
  keep.forEach((r, i) => {
    filters.push(`[0:v]trim=start=${r.start}:end=${r.end},setpts=PTS-STARTPTS[v${i}]`);
    filters.push(
      hasAudio
        ? `[0:a]atrim=start=${r.start}:end=${r.end},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
        : `anullsrc=r=44100:cl=stereo:d=${(r.end - r.start).toFixed(3)}[a${i}]`,
    );
  });
  filters.push(`${keep.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${keep.length}:v=1:a=1[vout][aout]`);
  return [
    "-y",
    "-i",
    "in.mp4",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    ...buildVideoCodecArgs({ pixFmt: "yuv420p" }),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputFile,
  ];
}

export async function cleanSpeechVideo(
  input: { videoUrl: string; language: CaptionLanguage; options: SpeechCutOptions; pathname: string },
  deps?: Partial<CleanSpeechDeps>,
): Promise<{ outputUrl: string; report: string; cutCount: number; outputMeta?: CanvasMediaMeta }> {
  const resolved = { ...defaultDeps(), ...deps };
  const dir = await mkdtemp(join(tmpdir(), "canvas-clean-speech-"));
  try {
    await resolved.downloadToFile(input.videoUrl, join(dir, "in.mp4"));
    const probed = parseMediaProbe(await resolved.probe(dir, "in.mp4"));
    if (!probed.hasAudio) throw new Error("來源影片沒有音訊，無法偵測口誤");
    if (probed.durationSec === undefined) throw new Error("無法讀取影片長度，請重新產生或重新上傳");
    await resolved.run(dir, ["-y", "-i", "in.mp4", "-vn", "-acodec", "libmp3lame", "-b:a", "128k", "speech.mp3"]);
    const spoken = await resolved.transcribe(await readFile(join(dir, "speech.mp3")), input.language);
    const words = spoken.words.map((w) => ({ ...w, text: applyCaptionScript(w.text ?? "", input.language) }));
    const { cuts, keep } = planSpeechCuts(words, probed.durationSec, input.options);
    const report = speechCutReport(cuts, keep, probed.durationSec);
    // Nothing to cut: the source already is the clean take.
    if (cuts.length === 0) {
      return { outputUrl: input.videoUrl, report, cutCount: 0, outputMeta: mediaMetaFromProbe(input.videoUrl, probed) };
    }
    if (keep.length === 0) throw new Error("剪走口誤後沒有剩下任何片段");
    await resolved.run(dir, keepRangesArgs(keep, true, "out.mp4"));
    const outputUrl = await resolved.persist(await readFile(join(dir, "out.mp4")), input.pathname);
    const done = parseMediaProbe(await resolved.probe(dir, "out.mp4").catch(() => ""));
    return {
      outputUrl,
      report,
      cutCount: cuts.length,
      ...(isUsableProbe(done) ? { outputMeta: mediaMetaFromProbe(outputUrl, done) } : {}),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
