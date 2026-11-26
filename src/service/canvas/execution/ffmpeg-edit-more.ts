// Argument builders for the newer edit nodes: split, text, background music, audio trim
// and join, picture adjust, freeze frame, and export.

import { buildVideoCodecArgs } from "@/service/ffmpeg/video-encoder";
import { cuesToAss, escapeFfmpegFilterPath } from "@/service/canvas/core/captions";
import type { SubtitleAssStyle } from "@/service/canvas/core/subtitle-look-styles";
import { SPLIT_SECOND_HANDLE, extraOutputPathname } from "@/service/canvas/core/extra-outputs";
import type { CanvasFfmpegLocalInputs } from "@/service/canvas/execution/ffmpeg-ops";
import { MISSING_CJK_FONT, resolveSubtitleFont } from "@/service/canvas/execution/edit-fonts";
import { boolParam, clamp, numParam, strParam } from "@/service/canvas/execution/ffmpeg-params";

export const MORE_EDIT_FFMPEG_MODELS = [
  "ffmpeg:split",
  "ffmpeg:text",
  "ffmpeg:audio-mix",
  "ffmpeg:audio-trim",
  "ffmpeg:audio-concat",
  "ffmpeg:adjust",
  "ffmpeg:freeze",
  "ffmpeg:export",
] as const;

const AAC = ["-c:a", "aac", "-b:a", "192k"];
const MP3 = ["-vn", "-c:a", "libmp3lame", "-b:a", "192k"];
const FASTSTART = ["-movflags", "+faststart"];
const STEREO = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";
const fx = (value: number) => value.toFixed(3);

// ASS &HAABBGGRR per text color.
const TEXT_COLOR_ASS: Record<string, string> = {
  white: "&H00FFFFFF",
  yellow: "&H0000E6FF",
  black: "&H00000000",
  lime: "&H004BF2C6",
  red: "&H00303BFF",
};

// The Text node is one ASS event, drawn by libass like burned subtitles, so it works
// with ffmpeg builds that have no drawtext.
export function textOverlayAss(snapshot: Record<string, unknown>, local: CanvasFfmpegLocalInputs): string {
  const words = strParam(snapshot, "ffmpegText", "").replace(/\\n/g, "\n");
  if (!words) throw new Error("請填要顯示的文字");
  const font = resolveSubtitleFont();
  if (!font) throw new Error(MISSING_CJK_FONT);
  const duration = local.durationsSec?.[0] || 36_000;
  const start = clamp(numParam(snapshot, "ffmpegTextStartSec", 0), 0, duration);
  const endRaw = numParam(snapshot, "ffmpegTextEndSec", 0);
  const end = endRaw > start ? Math.min(endRaw, duration) : duration;
  const colorName = strParam(snapshot, "ffmpegTextColor", "white");
  const boxed = boolParam(snapshot, "ffmpegTextBox");
  const style: SubtitleAssStyle = {
    primary: TEXT_COLOR_ASS[colorName] ?? TEXT_COLOR_ASS.white!,
    outline: boxed ? "&H73000000" : colorName === "black" ? "&H00FFFFFF" : "&H00000000",
    back: "&H73000000",
    bold: true,
    borderStyle: boxed ? 3 : 1,
    outlineWidth: boxed ? 12 : 4,
    shadow: 0,
    // cuesToAss sizes text at height / 18; the node's size is a % of the height.
    scale: (clamp(numParam(snapshot, "ffmpegTextSizePct", 5), 2, 15) / 100) * 18,
  };
  const position = strParam(snapshot, "ffmpegTextPosition", "bottom");
  return cuesToAss([{ start, end, text: words }], local.targetWidth ?? 1080, local.targetHeight ?? 1920, font.family, {
    style,
    alignment: position === "top" ? 8 : position === "center" ? 5 : 2,
  });
}

// File the export node writes inside the job directory, by format.
export function exportFormat(snapshot: Record<string, unknown>): "mp4" | "webm" | "gif" {
  const format = strParam(snapshot, "ffmpegFormat", "mp4");
  return format === "webm" || format === "gif" ? format : "mp4";
}

// Safe name for the exported file; empty when the user set none.
export function exportFileSlug(snapshot: Record<string, unknown>): string {
  return strParam(snapshot, "ffmpegFileName", "")
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function exportScale(resolution: string): string | null {
  const side = resolution === "720p" ? 720 : resolution === "1080p" ? 1080 : resolution === "4k" ? 2160 : 0;
  if (!side) return null;
  // The short side becomes `side`, keeping the frame shape.
  return `scale='if(gt(iw,ih),-2,${side})':'if(gt(iw,ih),${side},-2)':flags=lanczos`;
}

function x264Quality(quality: string): string[] {
  const crf = quality === "high" ? 18 : quality === "small" ? 28 : 23;
  const codec = buildVideoCodecArgs({ pixFmt: "yuv420p" });
  if (codec.includes("libx264")) return [...codec, "-crf", String(crf), "-preset", "medium"];
  const cq = codec.indexOf("-cq");
  if (cq >= 0) codec[cq + 1] = String(crf + 2);
  return codec;
}

export function buildMoreEditFfmpegArgs(
  modelId: string,
  snapshot: Record<string, unknown>,
  local: CanvasFfmpegLocalInputs,
  outputFile: string,
): string[] | null {
  if (!MORE_EDIT_FFMPEG_MODELS.includes(modelId as (typeof MORE_EDIT_FFMPEG_MODELS)[number])) return null;
  const video = local.videoFiles[0];
  const hasAudio = Boolean(local.hasAudioByVideo[0]);
  const duration = Math.max(0.2, local.durationsSec?.[0] ?? 0);
  const videoCodec = buildVideoCodecArgs({ pixFmt: "yuv420p" });

  if (modelId === "ffmpeg:split") {
    if (!video) throw new Error("分割需要輸入影片");
    const at = numParam(snapshot, "ffmpegAtSec", duration / 2);
    if (at <= 0.05 || at >= duration - 0.05) throw new Error(`切點 ${at}s 要落在影片長度（${fx(duration)}s）之內`);
    const filters = [
      `[0:v]split=2[va][vb]`,
      `[va]trim=end=${fx(at)},setpts=PTS-STARTPTS[v0]`,
      `[vb]trim=start=${fx(at)},setpts=PTS-STARTPTS[v1]`,
    ];
    if (hasAudio) {
      filters.push(
        `[0:a]asplit=2[aa][ab]`,
        `[aa]atrim=end=${fx(at)},asetpts=PTS-STARTPTS[a0]`,
        `[ab]atrim=start=${fx(at)},asetpts=PTS-STARTPTS[a1]`,
      );
    }
    const part = (index: number, file: string) => [
      "-map",
      `[v${index}]`,
      ...(hasAudio ? ["-map", `[a${index}]`, ...AAC] : ["-an"]),
      ...videoCodec,
      ...FASTSTART,
      file,
    ];
    return [
      "-y",
      "-i",
      video,
      "-filter_complex",
      filters.join(";"),
      ...part(0, outputFile),
      ...part(1, extraOutputPathname(outputFile, SPLIT_SECOND_HANDLE)),
    ];
  }

  if (modelId === "ffmpeg:text") {
    if (!video) throw new Error("文字需要輸入影片");
    if (!local.subtitleFile) throw new Error("沒有要畫的文字");
    const font = resolveSubtitleFont();
    if (!font) throw new Error(MISSING_CJK_FONT);
    const filter = `subtitles=${escapeFfmpegFilterPath(local.subtitleFile)}:fontsdir=${escapeFfmpegFilterPath(font.directory)}`;
    return ["-y", "-i", video, "-vf", filter, ...videoCodec, ...(hasAudio ? AAC : ["-an"]), ...FASTSTART, outputFile];
  }

  if (modelId === "ffmpeg:audio-mix") {
    if (!video || !local.audioFile) throw new Error("背景音樂需要影片和音樂");
    const volume = clamp(numParam(snapshot, "ffmpegBgmVolumeDb", -18), -40, 6);
    const start = Math.max(0, numParam(snapshot, "ffmpegBgmStartSec", 0));
    if (start >= duration) throw new Error("音樂開始時間超出影片長度");
    const loop = boolParam(snapshot, "ffmpegBgmLoop", true);
    const fadeOut = Math.min(clamp(numParam(snapshot, "ffmpegBgmFadeOutSec", 1.5), 0, 10), duration / 2);
    const duck = boolParam(snapshot, "ffmpegBgmDuck", true);
    const delayMs = Math.round(start * 1000);
    const bgm = [
      `[1:a]${STEREO},volume=${volume}dB`,
      delayMs > 0 ? `adelay=${delayMs}|${delayMs}` : "",
      `apad,atrim=end=${fx(duration)}`,
      fadeOut > 0 ? `afade=t=out:st=${fx(duration - fadeOut)}:d=${fx(fadeOut)}` : "",
    ]
      .filter(Boolean)
      .join(",");
    const filters = [`${bgm}[bgm]`];
    if (hasAudio && duck) {
      filters.push(
        `[0:a]${STEREO},asplit=2[voice][key]`,
        `[bgm][key]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[ducked]`,
        `[voice][ducked]amix=inputs=2:duration=first:normalize=0[aout]`,
      );
    } else if (hasAudio) {
      filters.push(`[0:a]${STEREO}[voice]`, `[voice][bgm]amix=inputs=2:duration=first:normalize=0[aout]`);
    } else {
      filters.push(`[bgm]anull[aout]`);
    }
    return [
      "-y",
      "-i",
      video,
      ...(loop ? ["-stream_loop", "-1"] : []),
      "-i",
      local.audioFile,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      ...AAC,
      "-t",
      fx(duration),
      ...FASTSTART,
      outputFile,
    ];
  }

  if (modelId === "ffmpeg:audio-trim") {
    if (!local.audioFile) throw new Error("音訊剪輯需要輸入音訊");
    const total = local.audioDurationSec;
    if (!total) throw new Error("無法讀取音訊長度，請重新上傳");
    const start = clamp(numParam(snapshot, "ffmpegStartSec", 0), 0, total);
    const endRaw = numParam(snapshot, "ffmpegEndSec", 0);
    const end = endRaw > start ? Math.min(endRaw, total) : total;
    if (end - start < 0.05) throw new Error("剪輯後沒有剩下音訊");
    const span = end - start;
    const fadeIn = Math.min(clamp(numParam(snapshot, "ffmpegFadeInSec", 0), 0, 10), span / 2);
    const fadeOut = Math.min(clamp(numParam(snapshot, "ffmpegFadeOutSec", 0), 0, 10), span / 2);
    const gain = clamp(numParam(snapshot, "ffmpegAudioGainDb", 0), -40, 24);
    const filter = [
      `atrim=start=${fx(start)}:end=${fx(end)},asetpts=PTS-STARTPTS`,
      gain !== 0 ? `volume=${gain}dB` : "",
      boolParam(snapshot, "ffmpegLoudnorm") ? "loudnorm=I=-16:TP=-1.5:LRA=11" : "",
      fadeIn > 0 ? `afade=t=in:st=0:d=${fx(fadeIn)}` : "",
      fadeOut > 0 ? `afade=t=out:st=${fx(span - fadeOut)}:d=${fx(fadeOut)}` : "",
    ]
      .filter(Boolean)
      .join(",");
    return ["-y", "-i", local.audioFile, "-af", filter, ...MP3, outputFile];
  }

  if (modelId === "ffmpeg:audio-concat") {
    const files = local.audioFiles ?? [];
    if (files.length === 0) throw new Error("音訊合併至少需要 1 段音訊");
    const gap = clamp(numParam(snapshot, "ffmpegGapSec", 0), 0, 5);
    const args = ["-y"];
    for (const file of files) args.push("-i", file);
    const filters = files.map(
      (_, i) => `[${i}:a]${STEREO},asetpts=PTS-STARTPTS${gap > 0 && i < files.length - 1 ? `,apad=pad_dur=${fx(gap)}` : ""}[a${i}]`,
    );
    filters.push(`${files.map((_, i) => `[a${i}]`).join("")}concat=n=${files.length}:v=0:a=1[aout]`);
    return [...args, "-filter_complex", filters.join(";"), "-map", "[aout]", ...MP3, outputFile];
  }

  if (modelId === "ffmpeg:adjust") {
    if (!video) throw new Error("調色需要輸入影片");
    const brightness = clamp(numParam(snapshot, "ffmpegBrightness", 0), -0.5, 0.5);
    const contrast = clamp(numParam(snapshot, "ffmpegContrast", 1), 0.5, 2);
    const saturation = clamp(numParam(snapshot, "ffmpegSaturation", 1), 0, 3);
    const kelvin = clamp(numParam(snapshot, "ffmpegTemperatureK", 6500), 3000, 10000);
    const filters = [`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`];
    // colortemperature tints toward a light of that temperature: below 6500 warmer, above cooler.
    if (Math.abs(kelvin - 6500) >= 50) filters.push(`colortemperature=temperature=${Math.round(13000 - kelvin)}`);
    if (boolParam(snapshot, "ffmpegVignette")) filters.push("vignette=PI/5");
    return ["-y", "-i", video, "-vf", filters.join(","), ...videoCodec, ...(hasAudio ? AAC : ["-an"]), ...FASTSTART, outputFile];
  }

  if (modelId === "ffmpeg:freeze") {
    if (!video) throw new Error("定格需要輸入影片");
    const at = clamp(numParam(snapshot, "ffmpegAtSec", 0), 0, Math.max(0, duration - 0.05));
    const hold = clamp(numParam(snapshot, "ffmpegDurationSec", 1), 0.2, 10);
    const lead = at > 0.04;
    const v = [`[0:v]fps=30,format=yuv420p,setsar=1,split=${lead ? 3 : 2}${lead ? "[s0]" : ""}[s1][s2]`];
    const a: string[] = [];
    const parts: string[] = [];
    if (lead) {
      v.push(`[s0]trim=end=${fx(at)},setpts=PTS-STARTPTS[v0]`);
      a.push(
        hasAudio
          ? `[0:a]${STEREO},atrim=end=${fx(at)},asetpts=PTS-STARTPTS[a0]`
          : `anullsrc=r=44100:cl=stereo,atrim=end=${fx(at)}[a0]`,
      );
      parts.push("[v0][a0]");
    }
    v.push(`[s1]trim=start=${fx(at)},trim=end_frame=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${fx(hold)}[v1]`);
    a.push(`anullsrc=r=44100:cl=stereo,atrim=end=${fx(hold + 1 / 30)}[a1]`);
    parts.push("[v1][a1]");
    v.push(`[s2]trim=start=${fx(at)},setpts=PTS-STARTPTS[v2]`);
    a.push(
      hasAudio
        ? `[0:a]${STEREO},atrim=start=${fx(at)},asetpts=PTS-STARTPTS[a2]`
        : `anullsrc=r=44100:cl=stereo,atrim=end=${fx(duration - at)}[a2]`,
    );
    parts.push("[v2][a2]");
    // Two reads of [0:a] need a split.
    if (hasAudio && lead) {
      a[0] = a[0]!.replace("[0:a]", "[as0]");
      a[2] = a[2]!.replace("[0:a]", "[as1]");
      a.unshift("[0:a]asplit=2[as0][as1]");
    }
    const graph = [...v, ...a, `${parts.join("")}concat=n=${parts.length}:v=1:a=1[vout][aout]`].join(";");
    return ["-y", "-i", video, "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]", ...videoCodec, ...AAC, ...FASTSTART, outputFile];
  }

  if (modelId === "ffmpeg:export") {
    if (!video) throw new Error("匯出需要輸入影片");
    const format = exportFormat(snapshot);
    const quality = strParam(snapshot, "ffmpegQuality", "standard");
    const scale = exportScale(strParam(snapshot, "ffmpegResolution", "source"));
    const fpsChoice = strParam(snapshot, "ffmpegFps", "source");
    if (format === "gif") {
      const fps = quality === "high" ? 15 : quality === "small" ? 10 : 12;
      const width = quality === "high" ? 540 : quality === "small" ? 360 : 480;
      const graph = `[0:v]fps=${fps},scale=${width}:-2:flags=lanczos,split[g0][g1];[g0]palettegen=stats_mode=diff[p];[g1][p]paletteuse=dither=bayer:bayer_scale=4[vout]`;
      return ["-y", "-i", video, "-filter_complex", graph, "-map", "[vout]", "-loop", "0", outputFile];
    }
    const vf = [scale, fpsChoice !== "source" ? `fps=${fpsChoice}` : ""].filter(Boolean).join(",");
    const loud = hasAudio && boolParam(snapshot, "ffmpegLoudnorm") ? ["-af", "loudnorm=I=-14:TP=-1:LRA=11"] : [];
    if (format === "webm") {
      const crf = quality === "high" ? 28 : quality === "small" ? 40 : 34;
      return [
        "-y",
        "-i",
        video,
        ...(vf ? ["-vf", vf] : []),
        ...loud,
        "-c:v",
        "libvpx-vp9",
        "-crf",
        String(crf),
        "-b:v",
        "0",
        "-row-mt",
        "1",
        "-deadline",
        "good",
        "-cpu-used",
        "4",
        ...(hasAudio ? ["-c:a", "libopus", "-b:a", "128k"] : ["-an"]),
        outputFile,
      ];
    }
    return [
      "-y",
      "-i",
      video,
      ...(vf ? ["-vf", vf] : []),
      ...loud,
      ...x264Quality(quality),
      ...(hasAudio ? AAC : ["-an"]),
      ...FASTSTART,
      outputFile,
    ];
  }

  return null;
}
