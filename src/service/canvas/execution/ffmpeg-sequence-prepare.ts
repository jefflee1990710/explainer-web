// Worker side of `ffmpeg:sequence`: downloads each wired source once, probes lengths, writes
// the text / caption ASS files, and returns the single FFmpeg command.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cuesFromSubtitleText, cuesToAss } from "@/service/canvas/core/captions";
import { parseMediaProbe } from "@/service/canvas/core/media-meta";
import { readSequence } from "@/service/canvas/core/sequence/document";
import { placeClips, sequenceFrameSize } from "@/service/canvas/core/sequence/timeline";
import { subtitleAlignment, subtitleAssStyle } from "@/service/canvas/core/subtitle-look-styles";
import { MISSING_CJK_FONT, resolveSubtitleFont } from "@/service/canvas/execution/edit-fonts";
import { textOverlayAss } from "@/service/canvas/execution/ffmpeg-edit-more";
import {
  buildSequenceFfmpegArgs,
  sequenceDurations,
  type SequenceLocalInputs,
  type SequenceLocalSource,
} from "@/service/canvas/execution/ffmpeg-sequence";

export type PrepareSequenceDeps = {
  downloadToFile: (url: string, dest: string) => Promise<void>;
  probeStderr: (dir: string, fileName: string) => Promise<string>;
};

function imageExt(url: string): string {
  const lower = url.toLowerCase();
  return lower.includes(".png") ? "png" : lower.includes(".webp") ? "webp" : "jpg";
}

export async function prepareSequenceRender(
  dir: string,
  snapshot: Record<string, unknown>,
  outputFile: string,
  deps: PrepareSequenceDeps,
): Promise<string[]> {
  const seq = readSequence(snapshot.toolParams as Record<string, unknown> | undefined);
  const urls = (snapshot.sequenceSources ?? {}) as Record<string, string>;

  // Which kind each referenced edge is used as.
  const wanted = new Map<string, SequenceLocalSource["kind"]>();
  for (const clip of seq.tracks.video) wanted.set(clip.ref, "video");
  for (const layer of seq.tracks.overlay) {
    if (layer.ref && layer.kind !== "text") wanted.set(layer.ref, layer.kind);
  }
  for (const item of seq.tracks.audio) wanted.set(item.ref, "audio");

  // One download per distinct URL, even when several items use the same source.
  const byUrl = new Map<string, SequenceLocalSource>();
  const sources: Record<string, SequenceLocalSource> = {};
  let count = 0;
  for (const [ref, kind] of wanted) {
    const url = urls[ref];
    if (!url) continue;
    const key = `${kind}|${url}`;
    let source = byUrl.get(key);
    if (!source) {
      const file = `seq-${count++}.${kind === "image" ? imageExt(url) : kind === "audio" ? "mp3" : "mp4"}`;
      await deps.downloadToFile(url, join(dir, file));
      source = { file, kind };
      if (kind !== "image") {
        const probed = parseMediaProbe(await deps.probeStderr(dir, file).catch(() => ""));
        source.durationSec = probed.durationSec;
        source.hasAudio = probed.hasAudio;
      }
      byUrl.set(key, source);
    }
    sources[ref] = source;
  }

  const placed = placeClips(seq, sequenceDurations({ sources, textFiles: {} }));
  const total = placed.length ? placed[placed.length - 1]!.end : 0;
  const { width, height } = sequenceFrameSize(seq);
  const local: SequenceLocalInputs = { sources, textFiles: {} };

  const textLayers = seq.tracks.overlay.filter((layer) => layer.kind === "text" && layer.text?.trim());
  const captions = typeof snapshot.prompt === "string" ? snapshot.prompt.trim() : "";
  if (textLayers.length || captions) {
    const font = resolveSubtitleFont();
    if (!font) throw new Error(MISSING_CJK_FONT);
    local.fontsDir = font.directory;
    for (const layer of textLayers) {
      const file = `text-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "")}.ass`;
      const ass = textOverlayAss(
        {
          toolParams: {
            ffmpegText: layer.text,
            ffmpegTextStartSec: layer.startSec,
            ...(layer.endSec !== undefined ? { ffmpegTextEndSec: layer.endSec } : {}),
            ffmpegTextColor: layer.color,
            ffmpegTextBox: layer.box,
            ffmpegTextSizePct: layer.sizePct,
            ffmpegTextPosition: layer.position,
          },
        },
        { videoFiles: [], hasAudioByVideo: [], durationsSec: [total], targetWidth: width, targetHeight: height },
      );
      await writeFile(join(dir, file), ass, "utf8");
      local.textFiles[layer.id] = file;
    }
    if (captions) {
      const look = seq.tracks.captions;
      const ass = cuesToAss(cuesFromSubtitleText(captions, Math.max(0.5, total)), width, height, font.family, {
        style: subtitleAssStyle(look?.look ?? "clean"),
        alignment: subtitleAlignment(look?.position ?? "bottom"),
      });
      await writeFile(join(dir, "captions.ass"), ass, "utf8");
      local.captionsFile = "captions.ass";
    }
  }

  return buildSequenceFfmpegArgs(seq, local, outputFile);
}
