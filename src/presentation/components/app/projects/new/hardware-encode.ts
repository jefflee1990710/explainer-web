import type { BrandAnchor, EditTransition } from "@/model/video-edit";
import {
  clipStarts,
  drawLayersAt,
  mixClipPcm,
  type ClipPcm,
  type DrawLayer,
} from "@/service/video-edit/hardware-composite";
import { layerPixelBox } from "@/service/video-edit/layer-placement";

type Accel = "prefer-hardware" | "no-preference";

export type LogoStamp = {
  blob: Blob;
  anchor: BrandAnchor;
  w: number;
  margin: number;
  opacity: number;
};

// Browser encoder for the slow paths (fade groups and logo burn-in).
// Hard cuts stay a stream copy. Missing WebCodecs returns null so the caller can use wasm.
export async function encodeFadeGroup(input: {
  blobs: Blob[];
  durations: number[];
  transitions: Array<EditTransition | undefined>;
  width: number;
  height: number;
  fps: number;
  signal: AbortSignal;
  onRatio?: (ratio: number) => void;
}): Promise<Uint8Array | null> {
  const width = even(input.width);
  const height = even(input.height);
  const fps = input.fps > 0 ? input.fps : 24;
  const accel = await encoderAccel(width, height, fps);
  if (!accel) return null;
  const opened = await openClips(input.blobs);
  try {
    throwIfAborted(input.signal);
    const audible = opened.every((clip) => clip.audio);
    const pcm = audible ? await readClipsPcm(opened, input.durations, input.signal) : null;
    // Keep the wasm path when the voice is there but this browser cannot re-encode it.
    if (audible && !pcm) return null;
    const outputRate = pcm ? await aacRate(pcm[0].sampleRate) : null;
    if (pcm && !outputRate) return null;
    const mixed = pcm && outputRate
      ? mixClipPcm({
          clips: pcm,
          durations: input.durations,
          transitions: input.transitions,
          outputRate,
        })
      : null;
    return await encodeFrames({
      width,
      height,
      fps,
      accel,
      signal: input.signal,
      audio: mixed,
      draw: (ctx, stamp) => drawFadeFrames(ctx, opened, input, width, height, fps, stamp),
    });
  } finally {
    for (const clip of opened) clip.input.dispose();
  }
}

// Re-encodes one reel with logos on top. Audio packets are copied, not re-encoded.
export async function encodeWithLayers(input: {
  video: Blob;
  layers: LogoStamp[];
  signal: AbortSignal;
  onRatio?: (ratio: number) => void;
}): Promise<Uint8Array | null> {
  const clip = await openClip(input.video);
  try {
    const width = even(await clip.video.getDisplayWidth());
    const height = even(await clip.video.getDisplayHeight());
    const statsFps = await frameRateOf(clip.video);
    const accel = await encoderAccel(width, height, statsFps);
    if (!accel) return null;
    const bitmaps = await Promise.all(input.layers.map((layer) => createImageBitmap(layer.blob)));
    try {
      return await encodeFrames({
        width,
        height,
        fps: statsFps,
        accel,
        signal: input.signal,
        audio: null,
        copyAudio: clip,
        draw: async (ctx, stamp) => {
          const sink = new (await media()).VideoSampleSink(clip.video, { hardwareAcceleration: "prefer-hardware" });
          let index = 0;
          const duration = await clip.video.computeDuration();
          const frames = Math.max(1, Math.round(duration * statsFps));
          for await (const sample of sink.samples()) {
            throwIfAborted(input.signal);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width, height);
            sample.draw(ctx, 0, 0, width, height);
            input.layers.forEach((layer, layerIndex) => {
              const bitmap = bitmaps[layerIndex];
              const box = layerPixelBox(
                { anchor: layer.anchor, w: layer.w, margin: layer.margin },
                width,
                height,
                bitmap.width,
                bitmap.height,
              );
              ctx.globalAlpha = layer.opacity;
              ctx.drawImage(bitmap, box.x, box.y, box.w, box.h);
            });
            ctx.globalAlpha = 1;
            await stamp(sample.timestamp, sample.duration || 1 / statsFps);
            sample.close();
            index += 1;
            input.onRatio?.(Math.min(1, index / frames));
          }
        },
      });
    } finally {
      for (const bitmap of bitmaps) bitmap.close();
    }
  } finally {
    clip.input.dispose();
  }
}

function even(value: number) {
  return Math.max(2, Math.floor(value / 2) * 2);
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("cancelled", "AbortError");
}

async function media() {
  return import("mediabunny");
}

async function encoderAccel(width: number, height: number, fps: number): Promise<Accel | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const { canEncodeVideo, Quality } = await media();
  const quality = new Quality({ quality: "high", preferBitrate: true });
  const base = { width, height, frameRate: fps, quality };
  if (await canEncodeVideo("avc", { ...base, hardwareAcceleration: "prefer-hardware" })) return "prefer-hardware";
  if (await canEncodeVideo("avc", { ...base, hardwareAcceleration: "no-preference" })) return "no-preference";
  return null;
}

async function aacRate(source: number) {
  const { canEncodeAudio } = await media();
  if (await canEncodeAudio("aac", { sampleRate: source, numberOfChannels: 2 })) return source;
  if (await canEncodeAudio("aac", { sampleRate: 48000, numberOfChannels: 2 })) return 48000;
  return null;
}

async function frameRateOf(track: import("mediabunny").InputVideoTrack) {
  const stats = await track.computePacketStats();
  return stats.averagePacketRate > 1 ? stats.averagePacketRate : 24;
}

type Opened = {
  input: { dispose: () => void };
  video: import("mediabunny").InputVideoTrack;
  audio: import("mediabunny").InputAudioTrack | null;
};

async function openClips(blobs: Blob[]) {
  return Promise.all(blobs.map((blob) => openClip(blob)));
}

async function openClip(blob: Blob): Promise<Opened> {
  const { Input, Mp4InputFormat, BlobSource } = await media();
  const input = new Input({ formats: [new Mp4InputFormat()], source: new BlobSource(blob) });
  const video = await input.getPrimaryVideoTrack();
  if (!video || !(await video.canDecode())) {
    input.dispose();
    throw new Error("decode");
  }
  const audio = await input.getPrimaryAudioTrack();
  return { input, video, audio };
}

async function readClipsPcm(clips: Opened[], durations: number[], signal: AbortSignal): Promise<ClipPcm[] | null> {
  if (clips.some((clip) => !clip.audio)) return null;
  const { AudioSampleSink } = await media();
  const pcm: ClipPcm[] = [];
  for (let index = 0; index < clips.length; index += 1) {
    throwIfAborted(signal);
    const audio = clips[index].audio;
    if (!audio || !(await audio.canDecode())) return null;
    const sampleRate = await audio.getSampleRate();
    const channelCount = await audio.getNumberOfChannels();
    const length = Math.max(1, Math.ceil(durations[index] * sampleRate));
    const channels = Array.from({ length: channelCount }, () => new Float32Array(length));
    const sink = new AudioSampleSink(audio);
    for await (const sample of sink.samples(0, durations[index])) {
      const buffer = sample.toAudioBuffer();
      const start = Math.round(sample.timestamp * sampleRate);
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
        const count = Math.min(data.length, channels[channel].length - Math.max(0, start));
        if (start >= 0 && count > 0) channels[channel].set(data.subarray(0, count), start);
      }
      sample.close();
    }
    pcm.push({ sampleRate, channels });
  }
  return pcm;
}

// Pull decoded frames in order and drop each one once the next frame is needed.
class FrameCursor {
  private pulled = 0;
  private current: import("mediabunny").VideoSample | null = null;
  private generator: AsyncGenerator<import("mediabunny").VideoSample | null> | null = null;

  constructor(
    private sink: import("mediabunny").VideoSampleSink,
    private times: number[],
  ) {}

  async at(index: number) {
    if (!this.generator) this.generator = this.sink.samplesAtTimestamps(this.times);
    while (this.pulled <= index) {
      if (this.pulled > 0) this.current?.close();
      const next = await this.generator.next();
      this.current = next.done ? null : next.value;
      this.pulled += 1;
    }
    return this.current;
  }

  close() {
    this.current?.close();
    this.current = null;
  }
}

async function drawFadeFrames(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  clips: Opened[],
  input: { durations: number[]; transitions: Array<EditTransition | undefined>; signal: AbortSignal; onRatio?: (ratio: number) => void },
  width: number,
  height: number,
  fps: number,
  stamp: (timestamp: number, duration: number) => Promise<void>,
) {
  const { duration } = clipStarts(input.durations, input.transitions);
  const frameCount = Math.max(1, Math.round(duration * fps));
  const frameDur = 1 / fps;
  const layers = Array.from({ length: frameCount }, (_, index) =>
    drawLayersAt(index * frameDur, input.durations, input.transitions),
  );
  const { VideoSampleSink } = await media();
  const cursors = clips.map((clip, clipIndex) => {
    const times: number[] = [];
    const indexes = layers.map((frame) => {
      const layer = frame.find((item) => item.clip === clipIndex);
      if (!layer) return -1;
      const previous = times[times.length - 1];
      if (times.length && previous != null && Math.abs(previous - layer.time) < 1e-4) return times.length - 1;
      times.push(layer.time);
      return times.length - 1;
    });
    const sink = new VideoSampleSink(clip.video, { hardwareAcceleration: "prefer-hardware" });
    return { cursor: new FrameCursor(sink, times), indexes };
  });
  try {
    for (let index = 0; index < frameCount; index += 1) {
      throwIfAborted(input.signal);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      for (const layer of layers[index]) await paintLayer(ctx, layer, cursors, index, width, height);
      await stamp(index * frameDur, frameDur);
      input.onRatio?.(Math.min(1, (index + 1) / frameCount));
    }
  } finally {
    for (const cursor of cursors) cursor.cursor.close();
  }
}

async function paintLayer(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  layer: DrawLayer,
  cursors: { cursor: FrameCursor; indexes: number[] }[],
  frame: number,
  width: number,
  height: number,
) {
  const cursor = cursors[layer.clip];
  const sampleIndex = cursor.indexes[frame];
  if (sampleIndex < 0) return;
  const sample = await cursor.cursor.at(sampleIndex);
  if (!sample) return;
  ctx.save();
  if (layer.window) {
    ctx.beginPath();
    ctx.rect(layer.window.x * width, layer.window.y * height, layer.window.w * width, layer.window.h * height);
    ctx.clip();
  }
  ctx.globalAlpha = layer.alpha;
  sample.draw(ctx, layer.dx * width, layer.dy * height, width, height);
  ctx.restore();
}

async function encodeFrames(input: {
  width: number;
  height: number;
  fps: number;
  accel: Accel;
  signal: AbortSignal;
  audio: { sampleRate: number; channels: Float32Array[] } | null;
  copyAudio?: Opened;
  draw: (
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    stamp: (timestamp: number, duration: number) => Promise<void>,
  ) => Promise<void>;
}) {
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, EncodedAudioPacketSource, EncodedPacketSink, Quality } =
    await media();
  const surface = drawingSurface(input.width, input.height);
  if (!surface) return null;
  const { canvas, ctx } = surface;
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const video = new CanvasSource(canvas, {
    codec: "avc",
    quality: new Quality({ quality: "high", preferBitrate: true }),
    hardwareAcceleration: input.accel,
    latencyMode: "quality",
  });
  output.addVideoTrack(video, { frameRate: input.fps });
  const audioSource = input.audio
    ? new AudioBufferSource({
        codec: "aac",
        quality: new Quality({ bitrate: 128_000 }),
      })
    : null;
  if (audioSource) output.addAudioTrack(audioSource);
  const packetSource = !audioSource && input.copyAudio?.audio
    ? new EncodedAudioPacketSource((await input.copyAudio.audio.getCodec()) || "aac")
    : null;
  if (packetSource) output.addAudioTrack(packetSource);
  try {
    await output.start();
    if (input.audio && audioSource) {
      const channels = input.audio.channels.length === 1
        ? [input.audio.channels[0], input.audio.channels[0]]
        : input.audio.channels;
      const buffer = new AudioBuffer({
        length: channels[0].length,
        numberOfChannels: channels.length,
        sampleRate: input.audio.sampleRate,
      });
      channels.forEach((data, index) => buffer.copyToChannel(new Float32Array(data), index));
      await audioSource.add(buffer);
    }
    if (packetSource && input.copyAudio?.audio) {
      const sink = new EncodedPacketSink(input.copyAudio.audio);
      const config = await input.copyAudio.audio.getDecoderConfig();
      let first = true;
      for await (const packet of sink.packets()) {
        throwIfAborted(input.signal);
        await packetSource.add(packet, first ? { decoderConfig: config ?? undefined } : undefined);
        first = false;
      }
    }
    await input.draw(ctx, (timestamp, duration) => video.add(timestamp, duration));
    await output.finalize();
    if (!target.buffer) return null;
    return new Uint8Array(target.buffer);
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }
}

function drawingSurface(width: number, height: number): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { alpha: false });
    return ctx ? { canvas, ctx } : null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  return ctx ? { canvas, ctx } : null;
}
