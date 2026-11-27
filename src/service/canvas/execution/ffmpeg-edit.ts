// Argument builders for the canvas edit nodes (cut, grade-free picture, sound, stills).
// `buildCanvasFfmpegArgs` delegates here so each edit stays out of the concat/mux path.

import { buildVideoCodecArgs } from "@/service/ffmpeg/video-encoder";
import {
  cuesFromSubtitleText,
  cuesToAss,
  escapeFfmpegFilterPath,
} from "@/service/canvas/core/captions";
import { complementRanges, parseKeepRanges } from "@/service/canvas/core/edit-ranges";
import { subtitleAlignment, subtitleAssStyle } from "@/service/canvas/core/subtitle-look-styles";
import { MISSING_CJK_FONT, resolveSubtitleFont } from "@/service/canvas/execution/edit-fonts";
import type { CanvasFfmpegLocalInputs } from "@/service/canvas/execution/ffmpeg-ops";
import { boolParam, clamp, even, numParam, strParam } from "@/service/canvas/execution/ffmpeg-params";

export { parseKeepRanges };

export const EDIT_FFMPEG_MODELS = [
  "ffmpeg:keep-ranges",
  "ffmpeg:volume",
  "ffmpeg:audio-fade",
  "ffmpeg:fade",
  "ffmpeg:crop",
  "ffmpeg:rotate",
  "ffmpeg:overlay",
  "ffmpeg:image-to-video",
  "ffmpeg:frame-grab",
  "ffmpeg:burn-subtitles",
] as const;


function frameSize(snapshot: Record<string, unknown>, local: CanvasFfmpegLocalInputs): { width: number; height: number } {
  const aspect = strParam(snapshot, "aspectRatio", strParam(snapshot, "presetId", "9:16"));
  if (aspect === "16:9") return { width: 1920, height: 1080 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  if (aspect === "4:3") return { width: 1440, height: 1080 };
  if (aspect === "3:4") return { width: 1080, height: 1440 };
  if (local.targetWidth && local.targetHeight) return { width: even(local.targetWidth), height: even(local.targetHeight) };
  return { width: 1080, height: 1920 };
}

function fadePair(snapshot: Record<string, unknown>, duration: number): { fadeIn: number; fadeOut: number; outStart: number } {
  const fadeIn = Math.min(5, Math.max(0, numParam(snapshot, "ffmpegFadeInSec", 0.4)));
  const fadeOut = Math.min(5, Math.max(0, numParam(snapshot, "ffmpegFadeOutSec", 0.4)));
  const span = Math.max(0.2, duration);
  const inDur = Math.min(fadeIn, span / 2);
  const outDur = Math.min(fadeOut, span / 2);
  return { fadeIn: inDur, fadeOut: outDur, outStart: Math.max(0, span - outDur) };
}

function overlayXY(position: string): { x: string; y: string } {
  if (position === "top-left") return { x: "24", y: "24" };
  if (position === "top-right") return { x: "main_w-overlay_w-24", y: "24" };
  if (position === "bottom-left") return { x: "24", y: "main_h-overlay_h-24" };
  if (position === "center") return { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" };
  return { x: "main_w-overlay_w-24", y: "main_h-overlay_h-24" };
}

function withAudio(args: string[], hasAudio: boolean, outputFile: string, reencodeVideo: boolean): string[] {
  const codec = reencodeVideo ? buildVideoCodecArgs({ pixFmt: "yuv420p" }) : ["-c:v", "copy"];
  return [
    ...args,
    ...codec,
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : ["-an"]),
    "-movflags",
    "+faststart",
    outputFile,
  ];
}

export function buildEditFfmpegArgs(
  modelId: string,
  snapshot: Record<string, unknown>,
  local: CanvasFfmpegLocalInputs,
  outputFile: string,
): string[] | null {
  if (!EDIT_FFMPEG_MODELS.includes(modelId as (typeof EDIT_FFMPEG_MODELS)[number])) return null;
  const video = local.videoFiles[0];
  const hasAudio = Boolean(local.hasAudioByVideo[0]);
  const duration = Math.max(0.2, local.durationsSec?.[0] ?? 5);

  if (modelId === "ffmpeg:keep-ranges") {
    if (!video) throw new Error("保留區間需要輸入影片");
    const listed = parseKeepRanges(strParam(snapshot, "ffmpegRanges", ""), duration);
    const ranges = strParam(snapshot, "ffmpegRangeMode", "keep") === "remove" ? complementRanges(listed, duration) : listed;
    if (ranges.length === 0) throw new Error("剪掉這些區間後沒有剩下任何片段");
    const filters: string[] = [];
    ranges.forEach((range, index) => {
      const span = (range.end - range.start).toFixed(3);
      filters.push(`[0:v]trim=start=${range.start}:end=${range.end},setpts=PTS-STARTPTS[v${index}]`);
      filters.push(
        hasAudio
          ? `[0:a]atrim=start=${range.start}:end=${range.end},asetpts=PTS-STARTPTS,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${index}]`
          : `anullsrc=r=44100:cl=stereo:d=${span},asetpts=PTS-STARTPTS[a${index}]`,
      );
    });
    const pairs = ranges.map((_, index) => `[v${index}][a${index}]`).join("");
    filters.push(`${pairs}concat=n=${ranges.length}:v=1:a=1[vout][aout]`);
    return [
      "-y",
      "-i",
      video,
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

  if (modelId === "ffmpeg:volume") {
    if (!video) throw new Error("音量調整需要輸入影片");
    if (!hasAudio) throw new Error("來源影片沒有音訊");
    const mode = strParam(snapshot, "ffmpegVolumeMode", strParam(snapshot, "presetId", "gain"));
    const gain = Math.min(24, Math.max(-40, numParam(snapshot, "ffmpegAudioGainDb", 0)));
    const filter = mode === "mute" ? "volume=0" : mode === "loudnorm" ? "loudnorm=I=-16:TP=-1.5:LRA=11" : `volume=${gain}dB`;
    return ["-y", "-i", video, "-af", filter, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputFile];
  }

  if (modelId === "ffmpeg:audio-fade") {
    if (!video) throw new Error("音訊淡化需要輸入影片");
    if (!hasAudio) throw new Error("來源影片沒有音訊");
    const fade = fadePair(snapshot, duration);
    const filter = `afade=t=in:st=0:d=${fade.fadeIn.toFixed(3)},afade=t=out:st=${fade.outStart.toFixed(3)}:d=${fade.fadeOut.toFixed(3)}`;
    return ["-y", "-i", video, "-af", filter, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputFile];
  }

  if (modelId === "ffmpeg:fade") {
    if (!video) throw new Error("淡入淡出需要輸入影片");
    const fade = fadePair(snapshot, duration);
    const vf = `fade=t=in:st=0:d=${fade.fadeIn.toFixed(3)},fade=t=out:st=${fade.outStart.toFixed(3)}:d=${fade.fadeOut.toFixed(3)}`;
    const args = ["-y", "-i", video, "-vf", vf];
    if (hasAudio) {
      args.push(
        "-af",
        `afade=t=in:st=0:d=${fade.fadeIn.toFixed(3)},afade=t=out:st=${fade.outStart.toFixed(3)}:d=${fade.fadeOut.toFixed(3)}`,
      );
    }
    return withAudio(args, hasAudio, outputFile, true);
  }

  if (modelId === "ffmpeg:crop") {
    if (!video) throw new Error("裁切需要輸入影片");
    const mode = strParam(snapshot, "ffmpegCropMode", strParam(snapshot, "presetId", "custom"));
    const cropW = numParam(snapshot, "ffmpegCropW", 0);
    const cropH = numParam(snapshot, "ffmpegCropH", 0);
    if (mode !== "letterbox" && (cropW < 2 || cropH < 2)) throw new Error("請填裁切寬度和高度");
    const crop =
      mode === "letterbox"
        ? local.detectedCrop
        : `${even(cropW)}:${even(cropH)}:${Math.max(0, Math.round(numParam(snapshot, "ffmpegCropX", 0)))}:${Math.max(0, Math.round(numParam(snapshot, "ffmpegCropY", 0)))}`;
    if (!crop) throw new Error("找不到可裁走的黑邊");
    return withAudio(["-y", "-i", video, "-vf", `crop=${crop},setsar=1`], hasAudio, outputFile, true);
  }

  if (modelId === "ffmpeg:rotate") {
    if (!video) throw new Error("旋轉需要輸入影片");
    const turns = strParam(snapshot, "ffmpegRotate", strParam(snapshot, "presetId", "90"));
    const filter =
      turns === "180"
        ? "transpose=1,transpose=1"
        : turns === "270"
          ? "transpose=2"
          : turns === "hflip"
            ? "hflip"
            : turns === "vflip"
              ? "vflip"
              : "transpose=1";
    return withAudio(["-y", "-i", video, "-vf", `${filter},setsar=1`], hasAudio, outputFile, true);
  }

  if (modelId === "ffmpeg:overlay") {
    if (!video) throw new Error("疊加需要輸入影片");
    const overlayImage = local.imageFile;
    const overlayVideo = local.overlayVideoFile;
    if (!overlayImage && !overlayVideo) throw new Error("請連接一張圖片或一段疊加影片");
    const positionName = strParam(snapshot, "ffmpegOverlayPosition", "bottom-right");
    const position =
      positionName === "custom"
        ? {
            x: `main_w*${(clamp(numParam(snapshot, "ffmpegOverlayX", 0), 0, 100) / 100).toFixed(4)}`,
            y: `main_h*${(clamp(numParam(snapshot, "ffmpegOverlayY", 0), 0, 100) / 100).toFixed(4)}`,
          }
        : overlayXY(positionName);
    const opacity = clamp(numParam(snapshot, "ffmpegOverlayOpacity", 1), 0.05, 1);
    const sizePct = clamp(numParam(snapshot, "ffmpegOverlaySizePct", 22), 5, 100);
    const width = even(Math.max(16, Math.round(((local.targetWidth ?? 1080) * sizePct) / 100)));
    const key = strParam(snapshot, "ffmpegChromaKey", "none");
    const keyFilter =
      key === "green" ? "chromakey=0x00FF00:0.18:0.08," : key === "blue" ? "chromakey=0x0000FF:0.18:0.08," : "";
    const start = Math.max(0, numParam(snapshot, "ffmpegOverlayStartSec", 0));
    const end = numParam(snapshot, "ffmpegOverlayEndSec", 0);
    const enable =
      start > 0 || end > start ? `:enable='between(t,${start.toFixed(3)},${(end > start ? end : 1e6).toFixed(3)})'` : "";
    const source = overlayImage ? ["-loop", "1", "-i", overlayImage] : ["-i", overlayVideo!];
    const graph = `[1:v]scale=${width}:-2,format=rgba,${keyFilter}colorchannelmixer=aa=${opacity.toFixed(2)}[ov];[0:v][ov]overlay=${position.x}:${position.y}:eof_action=pass:format=auto${enable}[vout]`;
    const args = ["-y", "-i", video, ...source, "-filter_complex", graph, "-map", "[vout]"];
    if (hasAudio) args.push("-map", "0:a:0");
    return withAudio(args, hasAudio, outputFile, true);
  }

  if (modelId === "ffmpeg:image-to-video") {
    if (!local.imageFile) throw new Error("圖片轉影片需要輸入圖片");
    const seconds = Math.min(30, Math.max(1, numParam(snapshot, "ffmpegDurationSec", 3)));
    const { width, height } = frameSize(snapshot, local);
    const frames = Math.round(seconds * 30);
    const picture = boolParam(snapshot, "ffmpegKenBurns")
      ? `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(1+0.0012*on\\,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=30,format=yuv420p[vout]`
      : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[vout]`;
    return [
      "-y",
      "-loop",
      "1",
      "-t",
      String(seconds),
      "-i",
      local.imageFile,
      "-f",
      "lavfi",
      "-t",
      String(seconds),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-filter_complex",
      `[0:v]${picture}`,
      "-map",
      "[vout]",
      "-map",
      "1:a:0",
      ...buildVideoCodecArgs({ pixFmt: "yuv420p" }),
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

  if (modelId === "ffmpeg:frame-grab") {
    if (!video) throw new Error("截圖需要輸入影片");
    const at = Math.min(Math.max(0, duration - 0.05), Math.max(0, numParam(snapshot, "ffmpegAtSec", 0)));
    return ["-y", "-i", video, "-ss", at.toFixed(3), "-frames:v", "1", "-q:v", "3", outputFile];
  }

  if (modelId === "ffmpeg:burn-subtitles") {
    if (!video) throw new Error("燒錄字幕需要輸入影片");
    if (!local.subtitleFile) throw new Error("沒有字幕內容");
    const font = resolveSubtitleFont();
    if (!font) throw new Error(MISSING_CJK_FONT);
    const filter = `subtitles=${escapeFfmpegFilterPath(local.subtitleFile)}:fontsdir=${escapeFfmpegFilterPath(font.directory)}`;
    return withAudio(["-y", "-i", video, "-vf", filter], hasAudio, outputFile, true);
  }

  return null;
}

// Writes the ASS file the burn node reads. Returns the file name inside the job directory.
export function burnSubtitleAss(
  snapshot: Record<string, unknown>,
  local: CanvasFfmpegLocalInputs,
): string {
  const text = strParam(snapshot, "prompt", "");
  const duration = Math.max(0.5, local.durationsSec?.[0] ?? 5);
  const cues = cuesFromSubtitleText(text, duration);
  const font = resolveSubtitleFont();
  if (!font) throw new Error(MISSING_CJK_FONT);
  return cuesToAss(cues, local.targetWidth ?? 1080, local.targetHeight ?? 1920, font.family, {
    style: subtitleAssStyle(strParam(snapshot, "subtitleLook", "clean")),
    alignment: subtitleAlignment(strParam(snapshot, "ffmpegSubtitlePosition", "bottom")),
  });
}
