import type { EditTransition, TransitionEffect } from "@/model/video-edit";

export type FrameWindow = { x: number; y: number; w: number; h: number };

// One clip's contribution to a single output frame. Fractions are of the frame size.
export type DrawLayer = {
  clip: number;
  time: number;
  alpha: number;
  dx: number;
  dy: number;
  window: FrameWindow | null;
};

export type ClipPcm = { sampleRate: number; channels: Float32Array[] };

// Same cap as the ffmpeg xfade: never longer than half the clip that is leaving.
export function fadeSeconds(transition: EditTransition | undefined, previousDuration: number) {
  if (!transition || transition.effect === "none" || transition.durationSec <= 0) return 0;
  return Math.min(transition.durationSec, Math.max(0, previousDuration) / 2);
}

// Output time where each clip's own t=0 appears. Later clips start early by the fade.
export function clipStarts(durations: number[], transitions: Array<EditTransition | undefined>) {
  const starts = [0];
  let timeline = durations[0] ?? 0;
  for (let index = 1; index < durations.length; index += 1) {
    const fade = fadeSeconds(transitions[index - 1], durations[index - 1] ?? 0);
    const start = timeline - fade;
    starts.push(start);
    timeline = start + (durations[index] ?? 0);
  }
  return { starts, duration: Math.max(0, timeline) };
}

// Layers are back to front: the clip that is leaving is drawn first.
export function drawLayersAt(
  time: number,
  durations: number[],
  transitions: Array<EditTransition | undefined>,
): DrawLayer[] {
  const { starts } = clipStarts(durations, transitions);
  const layers: DrawLayer[] = [];
  for (let index = 0; index < durations.length; index += 1) {
    const duration = durations[index] ?? 0;
    const local = time - starts[index];
    if (local < -1e-4 || local >= duration - 1e-4) continue;
    const fadeIn = index > 0 ? fadeSeconds(transitions[index - 1], durations[index - 1] ?? 0) : 0;
    const fadeOut = index < durations.length - 1 ? fadeSeconds(transitions[index], duration) : 0;
    let pose = { alpha: 1, dx: 0, dy: 0, window: null as FrameWindow | null };
    if (fadeIn > 0 && local < fadeIn) {
      pose = transitionPose(transitions[index - 1]?.effect ?? "fade", local / fadeIn, "in");
    } else if (fadeOut > 0 && local > duration - fadeOut) {
      const progress = (local - (duration - fadeOut)) / fadeOut;
      pose = transitionPose(transitions[index]?.effect ?? "fade", progress, "out");
    }
    if (pose.alpha <= 0) continue;
    if (pose.window && pose.window.w <= 0) continue;
    layers.push({ clip: index, time: Math.max(0, local), ...pose });
  }
  return layers;
}

// Linear audio crossfade for the overlap. Wipes and slides still crossfade the sound.
export function audioGainAt(
  time: number,
  clip: number,
  durations: number[],
  transitions: Array<EditTransition | undefined>,
) {
  const { starts } = clipStarts(durations, transitions);
  const duration = durations[clip] ?? 0;
  const local = time - starts[clip];
  if (local < 0 || local >= duration) return 0;
  const fadeIn = clip > 0 ? fadeSeconds(transitions[clip - 1], durations[clip - 1] ?? 0) : 0;
  const fadeOut = clip < durations.length - 1 ? fadeSeconds(transitions[clip], duration) : 0;
  if (fadeIn > 0 && local < fadeIn) return local / fadeIn;
  if (fadeOut > 0 && local > duration - fadeOut) return 1 - (local - (duration - fadeOut)) / fadeOut;
  return 1;
}

// Mix clip PCM onto one timeline. Each clip keeps its own sample rate; the output rate is chosen by the caller.
export function mixClipPcm(input: {
  clips: ClipPcm[];
  durations: number[];
  transitions: Array<EditTransition | undefined>;
  outputRate: number;
}) {
  const { duration } = clipStarts(input.durations, input.transitions);
  const rate = input.outputRate;
  const length = Math.max(1, Math.round(duration * rate));
  const channelCount = Math.max(1, ...input.clips.map((clip) => clip.channels.length));
  const mixed = Array.from({ length: channelCount }, () => new Float32Array(length));
  const { starts } = clipStarts(input.durations, input.transitions);
  for (let clip = 0; clip < input.clips.length; clip += 1) {
    const source = input.clips[clip];
    if (!source || source.channels.length === 0 || source.sampleRate <= 0) continue;
    for (let index = 0; index < length; index += 1) {
      const time = index / rate;
      const gain = audioGainAt(time, clip, input.durations, input.transitions);
      if (gain <= 0) continue;
      const position = (time - starts[clip]) * source.sampleRate;
      const left = Math.floor(position);
      if (left < 0) continue;
      const frac = position - left;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = source.channels[Math.min(channel, source.channels.length - 1)];
        const a = data[left] ?? 0;
        const b = data[left + 1] ?? a;
        mixed[channel][index] += (a + (b - a) * frac) * gain;
      }
    }
  }
  return { sampleRate: rate, channels: mixed };
}

function transitionPose(effect: TransitionEffect, progress: number, role: "in" | "out") {
  const p = Math.min(1, Math.max(0, progress));
  if (effect === "wipeleft") {
    if (role === "out") return full();
    return { alpha: 1, dx: 0, dy: 0, window: { x: 1 - p, y: 0, w: p, h: 1 } };
  }
  if (effect === "wiperight") {
    if (role === "out") return full();
    return { alpha: 1, dx: 0, dy: 0, window: { x: 0, y: 0, w: p, h: 1 } };
  }
  if (effect === "slideleft") {
    return role === "out"
      ? { alpha: 1, dx: -p, dy: 0, window: null }
      : { alpha: 1, dx: 1 - p, dy: 0, window: null };
  }
  if (effect === "slideright") {
    return role === "out"
      ? { alpha: 1, dx: p, dy: 0, window: null }
      : { alpha: 1, dx: -(1 - p), dy: 0, window: null };
  }
  return { alpha: role === "in" ? p : 1 - p, dx: 0, dy: 0, window: null };
}

function full() {
  return { alpha: 1, dx: 0, dy: 0, window: null as FrameWindow | null };
}
