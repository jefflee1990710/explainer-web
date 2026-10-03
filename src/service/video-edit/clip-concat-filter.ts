import type { EditTransition } from "@/model/video-edit";

const AUDIO_FORMAT = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";

function num(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function fadeSec(transition: EditTransition | undefined, durationSec: number) {
  if (!transition || transition.effect === "none") return 0;
  return Math.min(transition.durationSec, durationSec / 2);
}

// Join storyboard clips into one main stream. Audio only when every clip has it.
export function buildClipConcatFilter(
  count: number,
  hasAudio: boolean,
  durations: number[] = [],
  transitions: EditTransition[] = [],
) {
  if (count < 2) return "";
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    parts.push(`[${i}:v]setsar=1,format=yuv420p[v${i}]`);
    if (hasAudio) parts.push(`[${i}:a]${AUDIO_FORMAT}[a${i}]`);
  }

  const usesXfade = transitions.some((item, i) => fadeSec(item, durations[i] ?? 0) > 0);
  if (!usesXfade) {
    const pads: string[] = [];
    for (let i = 0; i < count; i += 1) {
      pads.push(`[v${i}]`);
      if (hasAudio) pads.push(`[a${i}]`);
    }
    parts.push(
      `${pads.join("")}concat=n=${count}:v=1:a=${hasAudio ? 1 : 0}${hasAudio ? "[v][a]" : "[v]"}`,
    );
    return parts.join(";");
  }

  let video = "v0";
  let audio = "a0";
  let timeline = durations[0] ?? 0;
  for (let i = 1; i < count; i += 1) {
    const fade = fadeSec(transitions[i - 1], durations[i - 1] ?? 0);
    const nextV = i === count - 1 ? "v" : `vx${i}`;
    const nextA = i === count - 1 ? "a" : `ax${i}`;
    if (fade > 0) {
      const offset = Math.max(0, timeline - fade);
      parts.push(
        `[${video}][v${i}]xfade=transition=${transitions[i - 1].effect}:duration=${num(fade)}:offset=${num(offset)}[${nextV}]`,
      );
      if (hasAudio) {
        parts.push(`[${audio}][a${i}]acrossfade=d=${num(fade)}[${nextA}]`);
      }
      timeline = offset + (durations[i] ?? 0);
    } else {
      const concatPads = hasAudio ? `[${video}][${audio}][v${i}][a${i}]` : `[${video}][v${i}]`;
      parts.push(
        `${concatPads}concat=n=2:v=1:a=${hasAudio ? 1 : 0}${hasAudio ? `[${nextV}][${nextA}]` : `[${nextV}]`}`,
      );
      timeline += durations[i] ?? 0;
    }
    video = nextV;
    audio = nextA;
  }
  return parts.join(";");
}
