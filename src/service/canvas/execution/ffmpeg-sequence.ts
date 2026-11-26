// Compiles an `ffmpeg:sequence` timeline into one FFmpeg command: every clip, transition,
// overlay, text layer, caption track, and audio item in a single filter_complex.

import type { CanvasSequence, SequenceTransition } from "@/model/canvas-sequence";
import { escapeFfmpegFilterPath } from "@/service/canvas/core/captions";
import {
  audioItemSec,
  placeClips,
  sequenceFrameSize,
  sequenceRenderLimitError,
  type SequenceDurations,
} from "@/service/canvas/core/sequence/timeline";
import { atempoChain } from "@/service/canvas/execution/ffmpeg-params";

export type SequenceLocalSource = {
  file: string;
  kind: "video" | "image" | "audio";
  durationSec?: number;
  hasAudio?: boolean;
};

export type SequenceLocalInputs = {
  // Downloaded media by wired edge id (the timeline's `ref`).
  sources: Record<string, SequenceLocalSource>;
  // One ASS file per text layer id.
  textFiles: Record<string, string>;
  captionsFile?: string;
  fontsDir?: string;
};

const AUDIO_FORMAT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
const n = (v: number) => String(Math.round(v * 1000) / 1000);
const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);

const XFADE: Record<Exclude<SequenceTransition, "cut">, string> = {
  fade: "fade",
  dissolve: "dissolve",
  wipeleft: "wipeleft",
  wiperight: "wiperight",
  slideleft: "slideleft",
  slideright: "slideright",
};

export function sequenceDurations(local: SequenceLocalInputs): SequenceDurations {
  const out: Record<string, number | undefined> = {};
  for (const [ref, source] of Object.entries(local.sources)) out[ref] = source.durationSec;
  return out;
}

export function buildSequenceFfmpegArgs(seq: CanvasSequence, local: SequenceLocalInputs, outputFile: string): string[] {
  const { width: W, height: H } = sequenceFrameSize(seq);
  const durations = sequenceDurations(local);
  const placed = placeClips(seq, durations);
  placed.forEach((p, i) => {
    const source = local.sources[p.clip.ref];
    if (!source || source.kind !== "video") throw new Error(`第 ${i + 1} 段片段沒有連接影片`);
    if (source.durationSec === undefined && p.clip.outSec === undefined) {
      throw new Error(`無法讀取第 ${i + 1} 段片段的長度，請重新產生或重新上傳`);
    }
    if (p.end - p.start <= 0) throw new Error(`第 ${i + 1} 段片段長度為 0，請檢查入點和出點`);
  });
  const total = placed.length ? placed[placed.length - 1]!.end : 0;
  const limit = sequenceRenderLimitError(seq, total);
  if (limit) throw new Error(limit);

  const args: string[] = ["-y"];
  const filters: string[] = [];
  let inputIndex = 0;
  const addInput = (file: string, pre: string[] = []) => {
    args.push(...pre, "-i", file);
    return inputIndex++;
  };

  // 1. Each clip: input-side seek + length, then the shared frame, rate, and audio format.
  const clipLabels = placed.map((p, i) => {
    const source = local.sources[p.clip.ref]!;
    const srcLen = Math.max(0.04, p.outSec - p.inSec);
    const len = p.end - p.start;
    const k = addInput(source.file, ["-ss", n(p.inSec), "-t", n(srcLen)]);
    const speed = p.clip.speed || 1;
    filters.push(
      `[${k}:v]setpts=(PTS-STARTPTS)/${n(speed)},scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${seq.fps},format=yuv420p,trim=duration=${n(len)}[cv${i}]`,
    );
    if (source.hasAudio && !p.clip.muted) {
      const tempo = Math.abs(speed - 1) >= 0.01 ? `,${atempoChain(speed)}` : "";
      filters.push(`[${k}:a]asetpts=PTS-STARTPTS${tempo},${AUDIO_FORMAT},apad,atrim=duration=${n(len)}[ca${i}]`);
    } else {
      filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${n(len)}[ca${i}]`);
    }
    return { v: `cv${i}`, a: `ca${i}` };
  });

  // 2. Joins: runs of cuts become one concat; a transition crossfades into the next run.
  let joinId = 0;
  const concatRun = (run: number[]): { v: string; a: string } => {
    if (run.length === 1) return clipLabels[run[0]!]!;
    const id = joinId++;
    const ins = run.map((i) => `[${clipLabels[i]!.v}][${clipLabels[i]!.a}]`).join("");
    // concat outputs a microsecond timebase; xfade needs both sides at 1/fps.
    filters.push(`${ins}concat=n=${run.length}:v=1:a=1[jr${id}][ja${id}]`, `[jr${id}]settb=1/${seq.fps}[jv${id}]`);
    return { v: `jv${id}`, a: `ja${id}` };
  };
  const runs: number[][] = [];
  placed.forEach((p, i) => {
    if (i === 0 || p.transitionSec > 0) runs.push([i]);
    else runs[runs.length - 1]!.push(i);
  });
  let current = concatRun(runs[0]!);
  for (let r = 1; r < runs.length; r += 1) {
    const first = placed[runs[r]![0]!]!;
    const next = concatRun(runs[r]!);
    const effect = XFADE[first.clip.transitionIn!.effect as Exclude<SequenceTransition, "cut">] ?? "fade";
    const id = joinId++;
    filters.push(
      `[${current.v}][${next.v}]xfade=transition=${effect}:duration=${n(first.transitionSec)}:offset=${n(first.start)}[xv${id}]`,
      `[${current.a}][${next.a}]acrossfade=d=${n(first.transitionSec)}:c1=tri:c2=tri[xa${id}]`,
    );
    current = { v: `xv${id}`, a: `xa${id}` };
  }
  let video = current.v;
  const mainAudio = current.a;

  // 3. Image / video layers, each shown only inside its own window.
  seq.tracks.overlay.forEach((layer, j) => {
    if (layer.kind === "text") return;
    const source = layer.ref ? local.sources[layer.ref] : undefined;
    if (!source) return;
    const start = Math.min(layer.startSec, total);
    const end = layer.endSec !== undefined && layer.endSec > start ? Math.min(layer.endSec, total) : total;
    if (end <= start) return;
    const k =
      source.kind === "image" ? addInput(source.file, ["-loop", "1", "-t", n(total)]) : addInput(source.file);
    const shift = source.kind === "video" ? `,setpts=PTS-STARTPTS+${n(start)}/TB` : "";
    const alpha = layer.opacity < 1 ? `,colorchannelmixer=aa=${n(layer.opacity)}` : "";
    const x = Math.round((W * layer.x) / 100);
    const y = Math.round((H * layer.y) / 100);
    filters.push(
      `[${k}:v]scale=${even((W * layer.scalePct) / 100)}:-2,format=rgba${alpha}${shift}[ov${j}]`,
      `[${video}][ov${j}]overlay=x=${x}:y=${y}:enable='between(t,${n(start)},${n(end)})':eof_action=pass[lv${j}]`,
    );
    video = `lv${j}`;
  });

  // 4. Text layers, then the caption track, drawn by libass.
  const fontsdir = local.fontsDir ? `:fontsdir=${escapeFfmpegFilterPath(local.fontsDir)}` : "";
  const assFiles = [
    ...seq.tracks.overlay.flatMap((layer) => (layer.kind === "text" && local.textFiles[layer.id] ? [local.textFiles[layer.id]!] : [])),
    ...(local.captionsFile ? [local.captionsFile] : []),
  ];
  assFiles.forEach((file, t) => {
    filters.push(`[${video}]subtitles=${escapeFfmpegFilterPath(file)}${fontsdir}[tv${t}]`);
    video = `tv${t}`;
  });

  // 5. Music / voice items, trimmed, faded, delayed to their start, optionally ducked under the clips.
  const items = seq.tracks.audio.flatMap((item) => {
    const source = local.sources[item.ref];
    if (!source || source.kind === "image") return [];
    const len = audioItemSec(item, source.durationSec, total);
    return len > 0.05 ? [{ item, source, len }] : [];
  });
  let audio = mainAudio;
  if (items.length) {
    const duckCount = items.filter((x) => x.item.duck).length;
    const mainLabels = Array.from({ length: duckCount + 1 }, (_, i) => `ma${i}`);
    filters.push(`[${mainAudio}]asplit=${mainLabels.length}${mainLabels.map((l) => `[${l}]`).join("")}`);
    let sidechain = 1;
    const mixed = items.map(({ item, source, len }, j) => {
      const k = addInput(source.file, item.loop ? ["-stream_loop", "-1"] : []);
      const steps = [
        `atrim=start=${n(item.inSec)}`,
        "asetpts=PTS-STARTPTS",
        AUDIO_FORMAT,
        `atrim=duration=${n(len)}`,
        item.gainDb ? `volume=${n(item.gainDb)}dB` : "",
        item.fadeInSec > 0 ? `afade=t=in:d=${n(Math.min(item.fadeInSec, len))}` : "",
        item.fadeOutSec > 0 ? `afade=t=out:st=${n(Math.max(0, len - item.fadeOutSec))}:d=${n(Math.min(item.fadeOutSec, len))}` : "",
        item.startSec > 0 ? `adelay=${Math.round(item.startSec * 1000)}:all=1` : "",
      ].filter(Boolean);
      filters.push(`[${k}:a]${steps.join(",")}[mu${j}]`);
      if (!item.duck) return `mu${j}`;
      filters.push(`[mu${j}][ma${sidechain}]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md${j}]`);
      sidechain += 1;
      return `md${j}`;
    });
    filters.push(
      `[ma0]${mixed.map((l) => `[${l}]`).join("")}amix=inputs=${mixed.length + 1}:duration=first:normalize=0[mix]`,
    );
    audio = "mix";
  }

  return [
    ...args,
    "-filter_complex",
    filters.join(";"),
    "-map",
    `[${video}]`,
    "-map",
    `[${audio}]`,
    "-c:v",
    "libx264",
    "-preset",
    seq.resolution === "4k" ? "faster" : "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(seq.fps),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-t",
    n(total),
    outputFile,
  ];
}
