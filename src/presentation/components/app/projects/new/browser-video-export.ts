"use client";

import type { FFFSType, FFmpeg } from "@ffmpeg/ffmpeg";
import type { BookendClip, EditTransition, VideoEdit } from "@/model/video-edit";
import { stableEditString } from "@/service/video-edit/edit-state";
import { fitClipArgs, joinPadArgs, stillClipArgs } from "@/service/reel/join-pad";
import { buildClipConcatFilter } from "@/service/video-edit/clip-concat-filter";
import { assemblyTransitions } from "@/service/video-edit/edit-transition";
import { assemblyRatio, assemblyRuns, type AssemblyStage } from "@/service/reel/assembly-plan";
import { buildFinalFilter } from "@/service/video-edit/final-filter";
import { layerPlacement } from "@/service/video-edit/layer-placement";
import { parseProbe } from "@/service/video-edit/probe";
import { mapLimit } from "@/util/map-limit";

// Single-thread build. The multi-thread core needs cross-origin isolation,
// which breaks Firebase sign-in. Fade groups and logo burn-in use WebCodecs
// instead of this wasm encoder; hard cuts stay a stream copy.
// ESM build: the ffmpeg worker is a module worker and imports the core as an ES module.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";
// Clips and layers download side by side.
const DOWNLOAD_LIMIT = 4;

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
  return concatBytes(await fetchChunks(url, onRatio, signal));
}

// A Blob can live outside the wasm heap, and the browser may page it to disk.
async function fetchBlob(url: string, onRatio: (ratio: number) => void, signal: AbortSignal) {
  return new Blob((await fetchChunks(url, onRatio, signal)) as Uint8Array<ArrayBuffer>[]);
}

async function fetchChunks(url: string, onRatio: (ratio: number) => void, signal: AbortSignal) {
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
  return chunks;
}

type InputFile = { name: string; blob: Blob };

let mountCount = 0;

// Expose downloads to ffmpeg without copying them into its memory (WORKERFS reads the Blob).
// Falls back to a normal in-memory write if the mount is refused.
async function mountInputs(ffmpeg: FFmpeg, files: InputFile[]) {
  if (files.length === 0) return { paths: [] as string[], release: async () => {} };
  const dir = `/in${(mountCount += 1)}`;
  try {
    await ffmpeg.createDir(dir);
    const blobs = files.map((file) => ({ name: file.name, data: file.blob }));
    if (await ffmpeg.mount("WORKERFS" as FFFSType, { blobs }, dir)) {
      return {
        paths: files.map((file) => `${dir}/${file.name}`),
        release: async () => {
          try {
            await ffmpeg.unmount(dir);
            await ffmpeg.deleteDir(dir);
          } catch {
            // A reset worker has already dropped the mount.
          }
        },
      };
    }
  } catch {
    // Fall through to the in-memory copy.
  }
  for (const file of files) await ffmpeg.writeFile(file.name, new Uint8Array(await file.blob.arrayBuffer()));
  return {
    paths: files.map((file) => file.name),
    release: async () => {
      for (const file of files) await forget(ffmpeg, file.name);
    },
  };
}

// Download several files at once. onRatio gets the average progress across all of them.
async function fetchBlobs(
  urls: string[],
  onRatio: (ratio: number, done: number) => void,
  signal: AbortSignal,
) {
  const received = urls.map(() => 0);
  let done = 0;
  const update = () => onRatio(received.reduce((sum, value) => sum + value, 0) / Math.max(1, urls.length), done);
  return mapLimit(urls, DOWNLOAD_LIMIT, async (url, index) => {
    const blob = await fetchBlob(
      url,
      (ratio) => {
        received[index] = ratio;
        update();
      },
      signal,
    );
    done += 1;
    update();
    return blob;
  });
}

// Run one ffmpeg command. Cancel resets the worker; a non-zero exit throws `failure`.
async function runEncoder(
  ffmpeg: FFmpeg,
  args: string[],
  signal: AbortSignal,
  failure: string,
  onRatio?: (ratio: number) => void,
) {
  const onEncode = ({ progress }: { progress: number }) => {
    onRatio?.(Math.max(0, Math.min(1, progress || 0)));
  };
  if (onRatio) ffmpeg.on("progress", onEncode);
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
    if (onRatio) ffmpeg.off("progress", onEncode);
  }
  if (signal.aborted) {
    resetEncoder();
    throw new ExportCancelled();
  }
  if (code !== 0) throw new Error(failure);
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

async function probeLog(ffmpeg: FFmpeg, name: string) {
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
  return lines.join("\n");
}

async function probeFile(ffmpeg: FFmpeg, name: string) {
  return parseProbe(await probeLog(ffmpeg, name));
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

// Concat clips, intro, and outro. A logo layer is the only reason for a final encode.
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
    if (exportPieceCount(clipUrls.length, edit) === 1) {
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
      await forgetEncoderFiles(ffmpeg, mainName);
    }
    return;
  }

  const ffmpeg = await loadEncoder((ratio) => onProgress({ phase: "encoder", ratio, phases }), signal);
  throwIfAborted(signal);

  // Bookends are already inside the joined file. Layers are the only extra inputs.
  const files: Array<{ name: string; url: string }> = [];
  const joined = exportPieceCount(clipUrls.length, edit) > 1;
  if (!joined) files.push({ name: "main.mp4", url: clipUrls[0] });
  edit.layers.forEach((layer, index) => {
    files.push({ name: `layer${index}.${extOf(layer.assetUrl)}`, url: layer.assetUrl });
  });

  let mainName = "main.mp4";
  let release = async () => {};
  try {
    if (joined) {
      mainName = await assembleClips(ffmpeg, clipUrls, edit, clipNumbers, onProgress, phases, signal);
    }
    const blobs = await fetchBlobs(
      files.map((file) => file.url),
      (ratio) => onProgress({ phase: "download", ratio, phases }),
      signal,
    );
    throwIfAborted(signal);
    const inputs = await mountInputs(
      ffmpeg,
      files.map((file, index) => ({ name: file.name, blob: blobs[index] })),
    );
    release = inputs.release;
    const pathOf = (name: string) => inputs.paths[files.findIndex((file) => file.name === name)];
    if (!joined) mainName = pathOf("main.mp4");

    const main = await probeFile(ffmpeg, mainName);
    if (!main.width || !main.height || !main.durationSec) throw new Error("probe");

    // Hardware encode the logo burn-in. Wasm libx264 below is the fallback.
    const burned = await hardwareLogo(
      joined ? null : blobs[0],
      joined ? blobs : blobs.slice(1),
      edit,
      main,
      ffmpeg,
      mainName,
      signal,
      (ratio) => onProgress({ phase: "encode", ratio, phases }),
    );
    if (burned) {
      remember(key, burned);
      onProgress({ phase: "save", ratio: 1, phases });
      saveBlob(burned, filename);
      return;
    }

    const args = ["-i", mainName];
    let nextIndex = 1;
    const layers = [];
    for (let index = 0; index < edit.layers.length; index += 1) {
      args.push("-i", pathOf(`layer${index}.${extOf(edit.layers[index].assetUrl)}`));
      layers.push({
        index: nextIndex++,
        placement: layerPlacement(edit.layers[index], main.width, main.height),
        opacity: edit.layers[index].opacity,
      });
    }
    const { filter, hasAudio } = buildFinalFilter({
      width: main.width,
      height: main.height,
      fps: main.fps,
      main: { durationSec: main.durationSec, hasAudio: main.hasAudio },
      layers,
    });
    args.push("-filter_complex", filter, "-map", "[v]");
    if (hasAudio) args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
    args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "final.mp4");

    onProgress({ phase: "encode", ratio: 0, phases });
    await runEncoder(ffmpeg, args, signal, "encode", (ratio) => onProgress({ phase: "encode", ratio, phases }));

    await saveEncoderFile(ffmpeg, "final.mp4", key, filename, phases, onProgress);
  } finally {
    await forgetEncoderFiles(ffmpeg, mainName);
    await release();
  }
}

// A logo cannot be stream-copied. Intro and outro are just more pieces to join.
export function exportNeedsRender(edit: VideoEdit) {
  return edit.layers.length > 0;
}

export function exportPieceCount(clipCount: number, edit: VideoEdit) {
  return clipCount + (edit.intro ? 1 : 0) + (edit.outro ? 1 : 0);
}

export function exportPhases(clipCount: number, edit: VideoEdit): ExportPhase[] {
  const pieces = exportPieceCount(clipCount, edit);
  if (!exportNeedsRender(edit)) {
    return pieces > 1 ? ["encoder", "join", "save"] : ["download", "save"];
  }
  if (pieces > 1) return ["encoder", "join", "download", "encode", "save"];
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

async function forgetEncoderFiles(ffmpeg: FFmpeg, mainName: string) {
  await forget(ffmpeg, mainName);
  await forget(ffmpeg, "final.mp4");
}

type AssemblyPiece = { url: string; imageDuration?: number; bookend?: boolean };

function bookendPiece(clip: BookendClip): AssemblyPiece {
  const piece: AssemblyPiece = { url: clip.assetUrl, bookend: true };
  if (clip.kind === "image") piece.imageDuration = clip.durationSec;
  return piece;
}

// Intro, each clip, then outro. Image bookends are turned into a short mp4 before the copy join.
function assemblyPieces(clipUrls: string[], edit: VideoEdit): AssemblyPiece[] {
  return [
    ...(edit.intro ? [bookendPiece(edit.intro)] : []),
    ...clipUrls.map((url) => ({ url })),
    ...(edit.outro ? [bookendPiece(edit.outro)] : []),
  ];
}

// Storyboard clips set the frame. Bookends are fitted to that, not the other way around.
function referenceIndex(pieces: AssemblyPiece[]) {
  const clip = pieces.findIndex((item) => item.imageDuration == null && !item.bookend);
  if (clip >= 0) return clip;
  return pieces.findIndex((item) => item.imageDuration == null);
}

// Join every piece in one pass:
// 1. download all pieces at once (kept as Blobs, outside the encoder's memory)
// 2. fit bookends and odd-sized pieces to the clip frame, and make the 200ms holds
// 3. encode each group of fade-joined pieces once
// 4. stream copy the groups and holds into one file
async function assembleClips(
  ffmpeg: FFmpeg,
  clipUrls: string[],
  edit: VideoEdit,
  clipNumbers: number[],
  onProgress: (job: ExportJob) => void,
  phases: ExportPhase[],
  signal: AbortSignal,
) {
  const pieces = assemblyPieces(clipUrls, edit);
  const transitions = assemblyTransitions(edit, clipNumbers);
  const runs = assemblyRuns(pieces.length, transitions);
  const fadeRuns = runs.filter((run) => run.length > 1);
  const total = pieces.length;

  function report(stage: AssemblyStage, ratio: number, done?: number) {
    onProgress({
      phase: "join",
      ratio: assemblyRatio(stage, ratio, fadeRuns.length > 0),
      phases,
      ...(stage === "download"
        ? { detailKey: "video.export.stepDownload", detail: { current: Math.min(total, (done ?? 0) + 1), total } }
        : {}),
    });
  }

  const blobs = await fetchBlobs(
    pieces.map((piece) => piece.url),
    (ratio, done) => report("download", ratio, done),
    signal,
  );
  throwIfAborted(signal);
  const inputs = await mountInputs(
    ffmpeg,
    pieces.map((piece, index) => ({
      name: `seg-${index}.${piece.imageDuration == null ? "mp4" : extOf(piece.url)}`,
      blob: blobs[index],
    })),
  );

  // Encoder-memory files this assembly wrote. All but the returned one are deleted.
  const made: string[] = [];
  let output = "";
  try {
    const refIndex = referenceIndex(pieces);
    if (refIndex < 0) throw new Error("probe");
    const ref = await probeFile(ffmpeg, inputs.paths[refIndex]);
    if (!ref.width || !ref.height) throw new Error("probe");
    const prepareSteps = total + runs.length - 1;

    // Image bookends become clips; a video at a different size, fps, or audio is scaled to match.
    const files: string[] = [];
    for (let index = 0; index < total; index += 1) {
      report("prepare", index / prepareSteps);
      const piece = pieces[index];
      const source = inputs.paths[index];
      const fitted = `fit-${index}.mp4`;
      if (piece.imageDuration != null) {
        await runEncoder(ffmpeg, stillClipArgs(source, fitted, ref, piece.imageDuration), signal, "concat");
      } else if (index === refIndex) {
        files.push(source);
        continue;
      } else {
        const current = await probeFile(ffmpeg, source);
        const same =
          current.width === ref.width &&
          current.height === ref.height &&
          current.fps === ref.fps &&
          current.hasAudio === ref.hasAudio;
        if (same) {
          files.push(source);
          continue;
        }
        await runEncoder(ffmpeg, fitClipArgs(source, fitted, ref, current.hasAudio), signal, "concat");
      }
      made.push(fitted);
      files.push(fitted);
    }

    // A hard cut holds the last frame of the group before it. A fade group ends on its last piece untouched.
    const holds: string[] = [];
    for (let index = 0; index < runs.length - 1; index += 1) {
      report("prepare", (total + index) / prepareSteps);
      const last = files[runs[index][runs[index].length - 1]];
      const hold = `hold-${index}.mp4`;
      await runEncoder(ffmpeg, joinPadArgs(last, hold, await probeLog(ffmpeg, last)), signal, "concat");
      made.push(hold);
      holds.push(hold);
    }

    // Only fade groups are encoded; every other clip is copied as is.
    const parts: string[] = [];
    let encoded = 0;
    for (let index = 0; index < runs.length; index += 1) {
      const run = runs[index];
      if (run.length === 1) {
        parts.push(files[run[0]]);
        continue;
      }
      const firstLog = await probeLog(ffmpeg, files[run[0]]);
      const probes = [parseProbe(firstLog)];
      for (const piece of run.slice(1)) probes.push(await probeFile(ffmpeg, files[piece]));
      const hasAudio = probes.every((probe) => probe.hasAudio);
      // The stream copy keeps the first file's audio rate. A group at another rate plays stretched.
      const sampleRate = firstLog.match(/Audio:.*?(\d+) Hz/)?.[1];
      const filter = buildClipConcatFilter(
        run.length,
        hasAudio,
        probes.map((probe) => probe.durationSec || 0),
        run.slice(0, -1).map((piece) => transitions[piece]),
      );
      const out = `run-${index}.mp4`;
      const step = encoded;
      const onEncode = (ratio: number) => report("join", ((step + ratio) / fadeRuns.length) * 0.95);
      const runBlobs = await Promise.all(run.map((piece) => pieceBlob(ffmpeg, files[piece], inputs.paths[piece], blobs[piece])));
      const hardware = await hardwareFade(
        runBlobs,
        probes.map((probe) => probe.durationSec || 0),
        run.slice(0, -1).map((piece) => transitions[piece]),
        ref,
        signal,
        onEncode,
      );
      if (!hardware) {
        const args = run.flatMap((piece) => ["-i", files[piece]]);
        args.push("-filter_complex", filter, "-map", "[v]");
        if (hasAudio) {
          args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
          if (sampleRate) args.push("-ar", sampleRate);
        }
        args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", out);
        await runEncoder(ffmpeg, args, signal, "concat", onEncode);
      } else {
        await ffmpeg.writeFile(out, hardware);
      }
      encoded += 1;
      made.push(out);
      parts.push(out);
    }

    if (parts.length === 1) {
      output = parts[0];
      return output;
    }
    const list = parts.flatMap((part, index) => (index < holds.length ? [part, holds[index]] : [part]));
    await ffmpeg.writeFile("list.txt", list.map((name) => `file '${name}'`).join("\n"));
    made.push("list.txt");
    report("join", fadeRuns.length > 0 ? 0.95 : 0);
    output = "joined.mp4";
    await runEncoder(
      ffmpeg,
      ["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", output],
      signal,
      "concat",
    );
    report("join", 1);
    return output;
  } catch (error) {
    if (output) await forget(ffmpeg, output);
    output = "";
    throw error;
  } finally {
    for (const name of made) if (name !== output) await forget(ffmpeg, name);
    await inputs.release();
  }
}

// A fitted piece lives in the encoder. An untouched download is still the original Blob.
async function pieceBlob(ffmpeg: FFmpeg, path: string, mounted: string, original: Blob) {
  if (path === mounted) return original;
  const raw = await ffmpeg.readFile(path);
  if (typeof raw === "string") throw new Error("concat");
  return new Blob([new Uint8Array(raw)]);
}

async function readEncoderBlob(ffmpeg: FFmpeg, name: string) {
  try {
    const raw = await ffmpeg.readFile(name);
    if (typeof raw === "string") return null;
    return new Blob([new Uint8Array(raw)]);
  } catch {
    return null;
  }
}

// WebCodecs for a fade group. Null means the wasm encoder should do it.
async function hardwareFade(
  blobs: Blob[],
  durations: number[],
  transitions: EditTransition[],
  frame: { width: number; height: number; fps: number },
  signal: AbortSignal,
  onRatio: (ratio: number) => void,
) {
  try {
    const { encodeFadeGroup } = await import("@/presentation/components/app/projects/new/hardware-encode");
    return await encodeFadeGroup({
      blobs,
      durations,
      transitions,
      width: frame.width,
      height: frame.height,
      fps: frame.fps,
      signal,
      onRatio,
    });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) throw new ExportCancelled();
    console.warn("WebCodecs fade encode failed, using the software encoder", error);
    return null;
  }
}

// WebCodecs for the logo pass. Null means the wasm encoder should burn it in.
async function hardwareLogo(
  mainBlob: Blob | null,
  layerBlobs: Blob[],
  edit: VideoEdit,
  frame: { width: number; height: number },
  ffmpeg: FFmpeg,
  mainName: string,
  signal: AbortSignal,
  onRatio: (ratio: number) => void,
) {
  try {
    const video = mainBlob ?? (await readEncoderBlob(ffmpeg, mainName));
    if (!video) return null;
    const { encodeWithLayers } = await import("@/presentation/components/app/projects/new/hardware-encode");
    return await encodeWithLayers({
      video,
      layers: edit.layers.map((layer, index) => {
        const placement = layerPlacement(layer, frame.width, frame.height);
        return {
          blob: layerBlobs[index],
          anchor: placement.anchor,
          w: placement.w,
          margin: placement.margin,
          opacity: layer.opacity,
        };
      }),
      signal,
      onRatio,
    });
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === "AbortError")) throw new ExportCancelled();
    console.warn("WebCodecs logo encode failed, using the software encoder", error);
    return null;
  }
}
