"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { VideoEdit } from "@/model/video-edit";
import { stableEditString } from "@/service/video-edit/edit-state";
import { buildClipConcatFilter } from "@/service/video-edit/clip-concat-filter";
import { clipPairTransitions, resolveTransition } from "@/service/video-edit/edit-transition";
import { pairwiseRatio, type PairwiseStep } from "@/service/reel/pairwise-progress";
import { clipTimelineId } from "@/service/video-edit/edit-timeline";
import { buildFinalFilter } from "@/service/video-edit/final-filter";
import { layerPlacement } from "@/service/video-edit/layer-placement";
import { parseProbe } from "@/service/video-edit/probe";
import type { BookendClip } from "@/model/video-edit";

// Single-thread build. The multi-thread core needs cross-origin isolation,
// which breaks Firebase sign-in.
// ESM build: the ffmpeg worker is a module worker and imports the core as an ES module.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";

export type ExportPhase = "encoder" | "download" | "join" | "encode" | "save";

export type ExportJob = {
  phase: ExportPhase;
  ratio: number;
  phases: ExportPhase[];
  // Which clip is being fetched or joined, while assembly runs one pair at a time.
  detailKey?: string;
  detail?: { current: number; total: number };
};

export class ExportCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "ExportCancelled";
  }
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

function resetEncoder() {
  ffmpegPromise = null;
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new ExportCancelled();
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function fetchBytes(url: string, onRatio: (ratio: number) => void, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw new ExportCancelled();
    throw error;
  }
  if (!response.ok || !response.body) throw new Error("download");
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    let done = false;
    let value: Uint8Array | undefined;
    try {
      const next = await reader.read();
      done = next.done;
      value = next.value;
    } catch (error) {
      if (signal.aborted) throw new ExportCancelled();
      throw error;
    }
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    received += value.byteLength;
    onRatio(total > 0 ? Math.min(1, received / total) : 0);
  }
  onRatio(1);
  return concatBytes(chunks);
}

async function blobUrl(url: string, mime: string, onRatio: (ratio: number) => void, signal: AbortSignal) {
  const bytes = await fetchBytes(url, onRatio, signal);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

async function loadEncoder(onRatio: (ratio: number) => void, signal: AbortSignal) {
  throwIfAborted(signal);
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      const coreURL = await blobUrl(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript", (ratio) => onRatio(ratio * 0.05), signal);
      const wasmURL = await blobUrl(
        `${CORE_BASE}/ffmpeg-core.wasm`,
        "application/wasm",
        (ratio) => onRatio(0.05 + ratio * 0.95),
        signal,
      );
      // The bundled worker rewrites dynamic import() into a hard error.
      // public/ffmpeg is the original worker, so it can still import the core blob.
      // Absolute URL: import.meta.url is a file:// path in dev, which would
      // otherwise resolve "/ffmpeg/worker.js" off the filesystem.
      const classWorkerURL = new URL("/ffmpeg/worker.js", window.location.href).href;
      await ffmpeg.load({ classWorkerURL, coreURL, wasmURL });
      return ffmpeg;
    })().catch((error) => {
      resetEncoder();
      throw error;
    });
  } else {
    onRatio(1);
  }
  return ffmpegPromise;
}

function extOf(url: string) {
  const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "bin";
}

function saveBlob(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes);
  const href = URL.createObjectURL(new Blob([copy], { type: "video/mp4" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

const rendered = new Map<string, Uint8Array>();

function remember(key: string, bytes: Uint8Array) {
  rendered.clear();
  rendered.set(key, bytes);
}

async function probeFile(ffmpeg: FFmpeg, name: string) {
  const lines: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    lines.push(message);
  };
  ffmpeg.on("log", onLog);
  try {
    await ffmpeg.exec(["-i", name]);
  } finally {
    ffmpeg.off("log", onLog);
  }
  return parseProbe(lines.join("\n"));
}

async function forget(ffmpeg: FFmpeg, name: string) {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    // The file may already be gone after a failed run.
  }
}

// Save a remote image or file. Used for the cover that rides with a video export.
export async function downloadRemoteFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download");
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

// Download one finished mp4 and hand it to the browser's save dialog.
export async function downloadVideoFile(
  url: string,
  filename: string,
  onProgress: (job: ExportJob) => void,
  signal: AbortSignal,
) {
  const phases: ExportPhase[] = ["download", "save"];
  const cached = rendered.get(url);
  if (cached) {
    onProgress({ phase: "save", ratio: 1, phases });
    saveBlob(cached, filename);
    return;
  }
  const bytes = await fetchBytes(url, (ratio) => onProgress({ phase: "download", ratio, phases }), signal);
  remember(url, bytes);
  onProgress({ phase: "save", ratio: 1, phases });
  saveBlob(bytes, filename);
}

// Concat clips, then burn layers and bookends in the browser, then save locally.
export async function renderVideoInBrowser(
  clipUrls: string[],
  edit: VideoEdit,
  filename: string,
  onProgress: (job: ExportJob) => void,
  signal: AbortSignal,
  clipNumbers: number[] = clipUrls.map((_, index) => index + 1),
) {
  if (clipUrls.length === 0) throw new Error("clips");
  const phases = exportPhases(clipUrls.length, edit);
  const key = `${clipUrls.join("|")}#${stableEditString(edit)}`;
  const cached = rendered.get(key);
  if (cached) {
    onProgress({ phase: "save", ratio: 1, phases });
    saveBlob(cached, filename);
    return;
  }

  // Nothing to burn in: save the clip, or the file the joins copied together.
  if (!exportNeedsRender(edit)) {
    if (clipUrls.length === 1) {
      const bytes = await fetchBytes(
        clipUrls[0],
        (ratio) => onProgress({ phase: "download", ratio, phases }),
        signal,
      );
      remember(key, bytes);
      onProgress({ phase: "save", ratio: 1, phases });
      saveBlob(bytes, filename);
      return;
    }
    const ffmpeg = await loadEncoder((ratio) => onProgress({ phase: "encoder", ratio, phases }), signal);
    throwIfAborted(signal);
    let mainName = "main.mp4";
    try {
      mainName = await assembleClips(ffmpeg, clipUrls, edit, clipNumbers, onProgress, phases, signal);
      await saveEncoderFile(ffmpeg, mainName, key, filename, phases, onProgress);
    } finally {
      await forgetEncoderFiles(ffmpeg, [], mainName);
    }
    return;
  }

  const ffmpeg = await loadEncoder((ratio) => onProgress({ phase: "encoder", ratio, phases }), signal);
  throwIfAborted(signal);

  // One clip is the main file. Several clips are joined first, two at a time.
  const files: Array<{ name: string; url: string }> = [];
  if (clipUrls.length === 1) files.push({ name: "main.mp4", url: clipUrls[0] });
  edit.layers.forEach((layer, index) => {
    files.push({ name: `layer${index}.${extOf(layer.assetUrl)}`, url: layer.assetUrl });
  });
  if (edit.intro) files.push({ name: `intro.${extOf(edit.intro.assetUrl)}`, url: edit.intro.assetUrl });
  if (edit.outro) files.push({ name: `outro.${extOf(edit.outro.assetUrl)}`, url: edit.outro.assetUrl });

  let mainName = "main.mp4";
  try {
    if (clipUrls.length > 1) {
      mainName = await assembleClips(ffmpeg, clipUrls, edit, clipNumbers, onProgress, phases, signal);
    }
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const bytes = await fetchBytes(
        file.url,
        (ratio) => onProgress({ phase: "download", ratio: (index + ratio) / files.length, phases }),
        signal,
      );
      await ffmpeg.writeFile(file.name, bytes);
    }

    const main = await probeFile(ffmpeg, mainName);
    if (!main.width || !main.height || !main.durationSec) throw new Error("probe");

    const args = ["-i", mainName];
    let nextIndex = 1;

    async function addBookend(slot: "intro" | "outro", clip?: BookendClip) {
      if (!clip) return undefined;
      const name = `${slot}.${extOf(clip.assetUrl)}`;
      const index = nextIndex++;
      if (clip.kind === "image") {
        args.push("-loop", "1", "-framerate", String(main.fps), "-t", String(clip.durationSec), "-i", name);
        return { index, kind: "image" as const, durationSec: clip.durationSec, hasAudio: false };
      }
      const probed = await probeFile(ffmpeg, name);
      if (!probed.durationSec) throw new Error("probe");
      args.push("-i", name);
      return { index, kind: "video" as const, durationSec: probed.durationSec, hasAudio: probed.hasAudio };
    }

    const intro = await addBookend("intro", edit.intro);
    const layers = [];
    for (let index = 0; index < edit.layers.length; index += 1) {
      args.push("-i", `layer${index}.${extOf(edit.layers[index].assetUrl)}`);
      layers.push({
        index: nextIndex++,
        placement: layerPlacement(edit.layers[index], main.width, main.height),
        opacity: edit.layers[index].opacity,
      });
    }
    const outro = await addBookend("outro", edit.outro);
    const firstClip = clipNumbers[0] ?? 1;
    const lastClip = clipNumbers[clipNumbers.length - 1] ?? firstClip;
    const { filter, hasAudio } = buildFinalFilter({
      width: main.width,
      height: main.height,
      fps: main.fps,
      main: { durationSec: main.durationSec, hasAudio: main.hasAudio },
      intro,
      outro,
      layers,
      introTransition: resolveTransition(edit, "intro", clipTimelineId(firstClip)),
      outroTransition: resolveTransition(edit, clipTimelineId(lastClip), "outro"),
    });
    args.push("-filter_complex", filter, "-map", "[v]");
    if (hasAudio) args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
    args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "final.mp4");

    onProgress({ phase: "encode", ratio: 0, phases });
    const onEncode = ({ progress }: { progress: number }) => {
      onProgress({ phase: "encode", ratio: Math.max(0, Math.min(1, progress || 0)), phases });
    };
    ffmpeg.on("progress", onEncode);
    let code = 1;
    try {
      code = await ffmpeg.exec(args, undefined, { signal });
    } catch (error) {
      if (signal.aborted) {
        resetEncoder();
        throw new ExportCancelled();
      }
      throw error;
    } finally {
      ffmpeg.off("progress", onEncode);
    }
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    if (code !== 0) throw new Error("encode");

    await saveEncoderFile(ffmpeg, "final.mp4", key, filename, phases, onProgress);
  } finally {
    await forgetEncoderFiles(ffmpeg, files.map((file) => file.name), mainName);
  }
}

// Layers and bookends need a final encode. A plain reel is already an mp4.
export function exportNeedsRender(edit: VideoEdit) {
  return edit.layers.length > 0 || Boolean(edit.intro) || Boolean(edit.outro);
}

export function exportPhases(clipCount: number, edit: VideoEdit): ExportPhase[] {
  if (!exportNeedsRender(edit)) {
    return clipCount > 1 ? ["encoder", "join", "save"] : ["download", "save"];
  }
  if (clipCount > 1) return ["encoder", "join", "download", "encode", "save"];
  return ["encoder", "download", "encode", "save"];
}

async function saveEncoderFile(
  ffmpeg: FFmpeg,
  name: string,
  key: string,
  filename: string,
  phases: ExportPhase[],
  onProgress: (job: ExportJob) => void,
) {
  const raw = await ffmpeg.readFile(name);
  if (typeof raw === "string") throw new Error("encode");
  const bytes = new Uint8Array(raw);
  remember(key, bytes);
  onProgress({ phase: "save", ratio: 1, phases });
  saveBlob(bytes, filename);
}

async function forgetEncoderFiles(ffmpeg: FFmpeg, names: string[], mainName: string) {
  for (const name of names) await forget(ffmpeg, name);
  await forget(ffmpeg, mainName);
  await forget(ffmpeg, "acc-a.mp4");
  await forget(ffmpeg, "acc-b.mp4");
  await forget(ffmpeg, "next.mp4");
  await forget(ffmpeg, "final.mp4");
  await forget(ffmpeg, "list.txt");
}

// Remux two mp4s. No fade and no second encode.
async function copyJoin(
  ffmpeg: FFmpeg,
  leftName: string,
  rightName: string,
  outName: string,
  signal: AbortSignal,
  onRatio: (ratio: number) => void,
) {
  await ffmpeg.writeFile("list.txt", `file '${leftName}'\nfile '${rightName}'\n`);
  onRatio(0);
  try {
    const code = await ffmpeg.exec(
      ["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", outName],
      undefined,
      { signal },
    );
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    if (code !== 0) throw new Error("concat");
    onRatio(1);
  } catch (error) {
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    throw error;
  } finally {
    await forget(ffmpeg, "list.txt");
  }
}

// Download clip 1, then clip 2, join them, then join that file with the next clip.
// Only the running pair stays in the encoder, and each step reports its own progress.
async function assembleClips(
  ffmpeg: FFmpeg,
  clipUrls: string[],
  edit: VideoEdit,
  clipNumbers: number[],
  onProgress: (job: ExportJob) => void,
  phases: ExportPhase[],
  signal: AbortSignal,
) {
  const transitions = clipPairTransitions(edit, clipNumbers);
  const total = clipUrls.length;
  let acc = "acc-a.mp4";
  let spare = "acc-b.mp4";

  function report(step: PairwiseStep, unitRatio: number) {
    onProgress({
      phase: "join",
      ratio: pairwiseRatio(step, unitRatio),
      phases,
      detailKey: step.phase === "download" ? "video.export.stepDownload" : "video.export.stepJoin",
      detail: { current: step.current, total: step.total },
    });
  }

  const first = await fetchBytes(
    clipUrls[0],
    (ratio) => report({ current: 1, total, phase: "download" }, ratio),
    signal,
  );
  throwIfAborted(signal);
  await ffmpeg.writeFile(acc, first);

  for (let index = 1; index < total; index += 1) {
    const current = index + 1;
    const bytes = await fetchBytes(
      clipUrls[index],
      (ratio) => report({ current, total, phase: "download" }, ratio),
      signal,
    );
    throwIfAborted(signal);
    await ffmpeg.writeFile("next.mp4", bytes);
    await joinPair(
      ffmpeg,
      acc,
      "next.mp4",
      spare,
      transitions[index - 1],
      signal,
      (ratio) => report({ current, total, phase: "join" }, ratio),
    );
    await forget(ffmpeg, acc);
    await forget(ffmpeg, "next.mp4");
    const previous = acc;
    acc = spare;
    spare = previous;
  }
  return acc;
}

// Join the clip accumulated so far with the one just downloaded.
// A hard cut copies the original files. A chosen fade still has to re-encode.
async function joinPair(
  ffmpeg: FFmpeg,
  leftName: string,
  rightName: string,
  outName: string,
  transition: ReturnType<typeof clipPairTransitions>[number],
  signal: AbortSignal,
  onRatio: (ratio: number) => void,
) {
  if (!transition || transition.effect === "none") {
    await copyJoin(ffmpeg, leftName, rightName, outName, signal, onRatio);
    return;
  }
  const left = await probeFile(ffmpeg, leftName);
  const right = await probeFile(ffmpeg, rightName);
  const hasAudio = left.hasAudio && right.hasAudio;
  const filter = buildClipConcatFilter(
    2,
    hasAudio,
    [left.durationSec || 0, right.durationSec || 0],
    [transition],
  );
  const args = ["-i", leftName, "-i", rightName, "-filter_complex", filter, "-map", "[v]"];
  if (hasAudio) args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", outName);
  onRatio(0);
  const onEncode = ({ progress }: { progress: number }) => {
    onRatio(Math.max(0, Math.min(1, progress || 0)));
  };
  ffmpeg.on("progress", onEncode);
  try {
    const code = await ffmpeg.exec(args, undefined, { signal });
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    if (code !== 0) throw new Error("concat");
  } catch (error) {
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    throw error;
  } finally {
    ffmpeg.off("progress", onEncode);
  }
}
