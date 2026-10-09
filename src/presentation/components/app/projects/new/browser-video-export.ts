"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { BookendClip, EditTransition, VideoEdit } from "@/model/video-edit";
import { stableEditString } from "@/service/video-edit/edit-state";
import { fitClipArgs, joinPadArgs, stillClipArgs } from "@/service/reel/join-pad";
import { buildClipConcatFilter } from "@/service/video-edit/clip-concat-filter";
import { assemblyTransitions } from "@/service/video-edit/edit-transition";
import { pairwiseRatio, type PairwiseStep } from "@/service/reel/pairwise-progress";
import { buildFinalFilter } from "@/service/video-edit/final-filter";
import { layerPlacement } from "@/service/video-edit/layer-placement";
import { parseProbe } from "@/service/video-edit/probe";

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
      await forgetEncoderFiles(ffmpeg, [], mainName);
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
  try {
    if (joined) {
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
    const layers = [];
    for (let index = 0; index < edit.layers.length; index += 1) {
      args.push("-i", `layer${index}.${extOf(edit.layers[index].assetUrl)}`);
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

async function forgetEncoderFiles(ffmpeg: FFmpeg, names: string[], mainName: string) {
  for (const name of names) await forget(ffmpeg, name);
  await forget(ffmpeg, mainName);
  await forget(ffmpeg, "acc-a.mp4");
  await forget(ffmpeg, "acc-b.mp4");
  await forget(ffmpeg, "next.mp4");
  await forget(ffmpeg, "final.mp4");
  await forget(ffmpeg, "list.txt");
}

// Remux two mp4s with a 200ms hold of the left clip's last frame between them.
async function copyJoin(
  ffmpeg: FFmpeg,
  leftName: string,
  rightName: string,
  outName: string,
  signal: AbortSignal,
  onRatio: (ratio: number) => void,
) {
  const padName = "join-pad.mp4";
  const probe = await probeLog(ffmpeg, leftName);
  throwIfAborted(signal);
  const padCode = await ffmpeg.exec(joinPadArgs(leftName, padName, probe), undefined, { signal });
  if (signal.aborted) {
    resetEncoder();
    throw new ExportCancelled();
  }
  if (padCode !== 0) throw new Error("concat");
  await ffmpeg.writeFile("list.txt", `file '${leftName}'\nfile '${padName}'\nfile '${rightName}'\n`);
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
    await forget(ffmpeg, "join-pad.mp4");
  }
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

// Download clip 1, then clip 2, join them, then join that file with the next clip.
// Intro and outro use the same steps. Only the running pair stays in the encoder.
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
  const total = pieces.length;
  const files = new Map<number, string>();
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

  // Storyboard clips set the frame. Bookends are fitted to that, not the other way around.
  function referenceIndex() {
    const clip = pieces.findIndex((item) => item.imageDuration == null && !item.bookend);
    if (clip >= 0) return clip;
    return pieces.findIndex((item) => item.imageDuration == null);
  }

  // Scale a video piece onto the clip frame when size, fps, or audio presence differ.
  async function fitVideoPiece(index: number, name: string) {
    const refIndex = referenceIndex();
    if (refIndex < 0 || refIndex === index) return name;
    const refName = await fileFor(refIndex);
    const ref = await probeFile(ffmpeg, refName);
    const current = await probeFile(ffmpeg, name);
    if (!ref.width || !ref.height) throw new Error("probe");
    const same =
      current.width === ref.width &&
      current.height === ref.height &&
      current.fps === ref.fps &&
      current.hasAudio === ref.hasAudio;
    if (same) return name;
    const fitted = `seg-${index}-fit.mp4`;
    let code = 1;
    try {
      code = await ffmpeg.exec(fitClipArgs(name, fitted, ref, current.hasAudio), undefined, { signal });
    } catch (error) {
      if (signal.aborted) {
        resetEncoder();
        throw new ExportCancelled();
      }
      throw error;
    }
    if (signal.aborted) {
      resetEncoder();
      throw new ExportCancelled();
    }
    if (code !== 0) throw new Error("concat");
    await forget(ffmpeg, name);
    return fitted;
  }

  async function fileFor(index: number): Promise<string> {
    const ready = files.get(index);
    if (ready) return ready;
    const piece = pieces[index];
    const name = `seg-${index}.mp4`;
    if (piece.imageDuration == null) {
      const bytes = await fetchBytes(
        piece.url,
        (ratio) => report({ current: index + 1, total, phase: "download" }, ratio),
        signal,
      );
      throwIfAborted(signal);
      await ffmpeg.writeFile(name, bytes);
      // A video ending shot at a different size cannot xfade onto the clips.
      const stored = await fitVideoPiece(index, name);
      files.set(index, stored);
      return stored;
    } else {
      const refIndex = referenceIndex();
      if (refIndex < 0) throw new Error("probe");
      const ref = await fileFor(refIndex);
      const stillName = "bookend-still";
      const bytes = await fetchBytes(
        piece.url,
        (ratio) => report({ current: index + 1, total, phase: "download" }, ratio),
        signal,
      );
      throwIfAborted(signal);
      await ffmpeg.writeFile(stillName, bytes);
      const frame = await probeFile(ffmpeg, ref);
      if (!frame.width || !frame.height) throw new Error("probe");
      let code = 1;
      try {
        code = await ffmpeg.exec(stillClipArgs(stillName, name, frame, piece.imageDuration), undefined, { signal });
      } catch (error) {
        if (signal.aborted) {
          resetEncoder();
          throw new ExportCancelled();
        }
        throw error;
      } finally {
        await forget(ffmpeg, stillName);
      }
      if (signal.aborted) {
        resetEncoder();
        throw new ExportCancelled();
      }
      if (code !== 0) throw new Error("concat");
    }
    files.set(index, name);
    return name;
  }

  let left = await fileFor(0);
  for (let index = 1; index < total; index += 1) {
    const right = await fileFor(index);
    const out = spare;
    await joinPair(
      ffmpeg,
      left,
      right,
      out,
      transitions[index - 1],
      signal,
      (ratio) => report({ current: index + 1, total, phase: "join" }, ratio),
    );
    await forget(ffmpeg, left);
    await forget(ffmpeg, right);
    files.delete(index - 1);
    files.delete(index);
    left = out;
    spare = spare === "acc-b.mp4" ? "acc-a.mp4" : "acc-b.mp4";
  }
  return left;
}

// Join the clip accumulated so far with the one just downloaded.
// A hard cut copies the files and holds the left clip for 200ms. A chosen fade still re-encodes.
async function joinPair(
  ffmpeg: FFmpeg,
  leftName: string,
  rightName: string,
  outName: string,
  transition: EditTransition | undefined,
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
