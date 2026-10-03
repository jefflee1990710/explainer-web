import { CLIP_EDGE_FADE_SEC } from "@/service/reel/fade";
import { overlayPosition, type LayerPlacement } from "@/service/video-edit/layer-placement";
import type { EditTransition } from "@/model/video-edit";

export type FinalSegmentInput = {
  index: number;
  kind: "video" | "image";
  durationSec: number;
  hasAudio: boolean;
};
export type FinalLayerInput = { index: number; placement: LayerPlacement; opacity: number };
export type FinalFilterInput = {
  width: number;
  height: number;
  fps: number;
  main: { durationSec: number; hasAudio: boolean };
  intro?: FinalSegmentInput;
  outro?: FinalSegmentInput;
  layers: FinalLayerInput[];
  introTransition?: EditTransition;
  outroTransition?: EditTransition;
};

const AUDIO_FORMAT = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";

function num(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

// One filter_complex: brand layers over the main reel, bookends cropped to
// the frame, 100ms edge fades, then concat intro → main → outro.
export function buildFinalFilter(input: FinalFilterInput) {
  const { width: W, height: H, fps } = input;
  const hasAudio = input.main.hasAudio || Boolean(input.intro?.hasAudio) || Boolean(input.outro?.hasAudio);
  const parts: string[] = [];

  // Main reel with every layer stacked in order.
  parts.push(`[0:v]setsar=1,fps=${fps},format=yuv420p[m0]`);
  let mainLabel = "m0";
  input.layers.forEach((layer, i) => {
    const { x, y } = overlayPosition(layer.placement);
    parts.push(
      `[${layer.index}:v]scale=${layer.placement.w}:-2,format=rgba,colorchannelmixer=aa=${num(layer.opacity)}[l${i}]`,
    );
    parts.push(`[${mainLabel}][l${i}]overlay=x=${x}:y=${y}[m${i + 1}]`);
    mainLabel = `m${i + 1}`;
  });

  type Segment = { v: string; a?: string; duration: number; role: "intro" | "main" | "outro" };
  const segments: Segment[] = [];

  function audioFor(index: number, present: boolean, duration: number, label: string) {
    if (!hasAudio) return undefined;
    parts.push(
      present
        ? `[${index}:a]${AUDIO_FORMAT},apad,atrim=0:${num(duration)}[${label}]`
        : `anullsrc=r=44100:cl=stereo,atrim=0:${num(duration)},${AUDIO_FORMAT}[${label}]`,
    );
    return label;
  }

  function bookend(seg: FinalSegmentInput, key: "intro" | "outro"): Segment {
    parts.push(
      `[${seg.index}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps},format=yuv420p[${key}v]`,
    );
    return {
      v: `${key}v`,
      a: audioFor(seg.index, seg.hasAudio, seg.durationSec, `${key}a`),
      duration: seg.durationSec,
      role: key,
    };
  }

  if (input.intro) segments.push(bookend(input.intro, "intro"));
  parts.push(`[${mainLabel}]format=yuv420p[mainv]`);
  segments.push({
    v: "mainv",
    a: audioFor(0, input.main.hasAudio, input.main.durationSec, "maina"),
    duration: input.main.durationSec,
    role: "main",
  });
  if (input.outro) segments.push(bookend(input.outro, "outro"));

  const pairTransition = (right: Segment): EditTransition | undefined => {
    if (right.role === "main") return input.introTransition;
    if (right.role === "outro") return input.outroTransition;
    return undefined;
  };
  const usesXfade = segments.some((seg, i) => i > 0 && pairTransition(seg)?.effect && pairTransition(seg)?.effect !== "none");

  if (usesXfade) {
    let video = segments[0].v;
    let audio = segments[0].a;
    let timeline = segments[0].duration;
    for (let i = 1; i < segments.length; i += 1) {
      const next = segments[i];
      const transition = pairTransition(next);
      const fade =
        transition && transition.effect !== "none"
          ? Math.min(transition.durationSec, timeline / 2, next.duration / 2)
          : 0;
      const outV = i === segments.length - 1 ? "v" : `xv${i}`;
      const outA = i === segments.length - 1 ? "a" : `xa${i}`;
      if (fade > 0 && transition) {
        parts.push(
          `[${video}][${next.v}]xfade=transition=${transition.effect}:duration=${num(fade)}:offset=${num(timeline - fade)}[${outV}]`,
        );
        if (hasAudio && audio && next.a) {
          parts.push(`[${audio}][${next.a}]acrossfade=d=${num(fade)}[${outA}]`);
        }
        timeline = timeline - fade + next.duration;
      } else {
        const pads = hasAudio && audio && next.a ? `[${video}][${audio}][${next.v}][${next.a}]` : `[${video}][${next.v}]`;
        parts.push(
          `${pads}concat=n=2:v=1:a=${hasAudio && audio && next.a ? 1 : 0}${
            hasAudio && audio && next.a ? `[${outV}][${outA}]` : `[${outV}]`
          }`,
        );
        timeline += next.duration;
      }
      video = outV;
      audio = outA;
    }
    return { filter: parts.join(";"), hasAudio };
  }

  // Edge fades, same rule as the reel concat.
  const pads: string[] = [];
  segments.forEach((seg, i) => {
    const fade = Math.min(CLIP_EDGE_FADE_SEC, seg.duration / 2);
    const outAt = num(Math.max(0, seg.duration - fade));
    const vf: string[] = [];
    const af: string[] = [];
    if (i > 0) {
      vf.push(`fade=t=in:st=0:d=${num(fade)}`);
      af.push(`afade=t=in:st=0:d=${num(fade)}`);
    }
    if (i < segments.length - 1) {
      vf.push(`fade=t=out:st=${outAt}:d=${num(fade)}`);
      af.push(`afade=t=out:st=${outAt}:d=${num(fade)}`);
    }
    parts.push(`[${seg.v}]${vf.join(",") || "null"}[s${i}v]`);
    pads.push(`[s${i}v]`);
    if (seg.a) {
      parts.push(`[${seg.a}]${af.join(",") || "anull"}[s${i}a]`);
      pads.push(`[s${i}a]`);
    }
  });

  parts.push(
    `${pads.join("")}concat=n=${segments.length}:v=1:a=${hasAudio ? 1 : 0}${hasAudio ? "[v][a]" : "[v]"}`,
  );
  return { filter: parts.join(";"), hasAudio };
}
