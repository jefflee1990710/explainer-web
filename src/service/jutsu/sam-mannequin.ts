import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type {
  JutsuPersonAnchor,
  JutsuPersonMapping,
  JutsuPlacementBox,
} from "@/model/jutsu-job";
import { hasFalKey } from "@/service/fal/key";
import { decodeFalSparseRle, resizeBinaryMaskNearest, unionBinaryMasks } from "@/service/fal/rle";
import {
  type FalSam3PointPrompt,
  segmentVideoWithFalSam3Rle,
} from "@/service/fal/sam3-video";
import {
  applyPeopleMask,
  dilateMask,
  fillMaskHoles,
  holdMasksOverTime,
  invertMask,
  JUTSU_EDIT_HEADROOM,
  JUTSU_EDIT_HOLD_FRAMES,
  JUTSU_MANNEQUIN_HOLD_FRAMES,
  JUTSU_SAM_LONG_EDGE,
  mannequinExpandPixels,
  maskHasForeground,
  openJutsuGreyByte,
  paintOpenJutsuMannequinFrame,
  type OpenJutsuMaskMode,
} from "@/service/jutsu/grey-mannequin";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

export const JUTSU_MARGINS = {
  tight: 20,
  normal: 40,
  loose: 60,
} as const;

export type JutsuMaskMargin = keyof typeof JUTSU_MARGINS;

/** `subject` greys the person. `background` flips the grown mask so the surroundings go grey. */
export type JutsuMannequinMaskMode = OpenJutsuMaskMode;

/** Openjutsu SAM canvas. Motion frames stay at `motionSize`; only the tracker sees 1008 px. */
export { JUTSU_SAM_LONG_EDGE };

/** `fps=24` plus long-edge scale, matching `ImageScaleToMaxDimension`. */
export function jutsuLongEdgeScaleFilter(longEdge: number): string {
  return `fps=24,scale='if(gt(iw,ih),${longEdge},-2)':'if(gt(iw,ih),-2,${longEdge})'`;
}

export const JUTSU_MOTION_SIZES = [512, 768, 1376] as const;
export type JutsuMotionSize = (typeof JUTSU_MOTION_SIZES)[number];

export type TrackedMaskBox = {
  frameIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Ported from Openjutsu `H3PeopleMask` (`headroom: 0.1`, `GrowMaskWithBlur` `expand: 20|40|60` at 1008px):
 * Expands a normalized `[0..1]` bounding box with top headroom and pixel margin.
 */
export function expandTrackedBoxWithHeadroomAndMargin(
  box: { x: number; y: number; width: number; height: number },
  options: {
    headroom?: number;
    margin: JutsuMaskMargin;
    canvasSize?: number;
  },
): { x: number; y: number; width: number; height: number } {
  const headroom = options.headroom ?? 0.1;
  const expandRatio = JUTSU_MARGINS[options.margin] / (options.canvasSize ?? 1008);

  const headroomDelta = box.height * headroom;
  const x0 = Math.max(0, box.x - expandRatio);
  const y0 = Math.max(0, box.y - headroomDelta - expandRatio);
  const x1 = Math.min(1, box.x + box.width + expandRatio);
  const y1 = Math.min(1, box.y + box.height + expandRatio);

  return {
    x: Math.round(x0 * 1000) / 1000,
    y: Math.round(y0 * 1000) / 1000,
    width: Math.round(Math.max(0.05, x1 - x0) * 1000) / 1000,
    height: Math.round(Math.max(0.05, y1 - y0) * 1000) / 1000,
  };
}

/** Interpolate tracked bounding boxes across every frame at 24fps. */
export function interpolateTrackedBoxes(
  keyframes: readonly TrackedMaskBox[],
  totalFrames: number,
): Array<{ x: number; y: number; width: number; height: number }> {
  if (keyframes.length === 0) {
    return Array.from({ length: totalFrames }, () => ({
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.85,
    }));
  }
  const sorted = [...keyframes].sort((a, b) => a.frameIndex - b.frameIndex);
  const out: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let f = 0; f < totalFrames; f++) {
    const nextIdx = sorted.findIndex((k) => k.frameIndex >= f);
    if (nextIdx === -1) {
      const last = sorted[sorted.length - 1]!;
      out.push({ x: last.x, y: last.y, width: last.width, height: last.height });
    } else if (nextIdx === 0 || sorted[nextIdx]!.frameIndex === f) {
      const cur = sorted[nextIdx]!;
      out.push({ x: cur.x, y: cur.y, width: cur.width, height: cur.height });
    } else {
      const a = sorted[nextIdx - 1]!;
      const b = sorted[nextIdx]!;
      const span = Math.max(1, b.frameIndex - a.frameIndex);
      const t = (f - a.frameIndex) / span;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        width: a.width + (b.width - a.width) * t,
        height: a.height + (b.height - a.height) * t,
      });
    }
  }
  return out;
}

/**
 * Render one frame of Openjutsu's `H3GreyMannequins` + `Mask | Mannequin` preview:
 * - Returns `mannequinFrame`: the source frame with the tracked target turned into a sharp grey silhouette (`#808080` modulated by source luma edges) so H3 `ref2va` copies exact pose/hands/fingers without copying the original person's clothes or face.
 * - Returns `checkMaskFrame`: side-by-side `Mask (cyan regenerated area + orange tracked target) | Grey Mannequin` exactly matching `workflows/mask.api.json` (`ImageStitch`).
 */
export async function renderGreyMannequinAndMaskFrame(input: {
  frameBuffer: Buffer;
  tightBox: { x: number; y: number; width: number; height: number };
  grownBox: { x: number; y: number; width: number; height: number };
}): Promise<{ mannequinJpeg: Buffer; checkMaskJpeg: Buffer }> {
  const { data, info } = await sharp(input.frameBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const mannequinBuf = Buffer.from(data);
  const maskPreviewBuf = Buffer.from(data);

  const tx0 = Math.floor(input.tightBox.x * width);
  const ty0 = Math.floor(input.tightBox.y * height);
  const tx1 = Math.ceil((input.tightBox.x + input.tightBox.width) * width);
  const ty1 = Math.ceil((input.tightBox.y + input.tightBox.height) * height);

  const gx0 = Math.floor(input.grownBox.x * width);
  const gy0 = Math.floor(input.grownBox.y * height);
  const gx1 = Math.ceil((input.grownBox.x + input.grownBox.width) * width);
  const gy1 = Math.ceil((input.grownBox.y + input.grownBox.height) * height);

  // Ellipse radii for smooth silhouette mannequin & tapered corners (`tapered_corners: true`)
  const tcx = (tx0 + tx1) / 2;
  const tcy = (ty0 + ty1) / 2;
  const trx = Math.max(1, (tx1 - tx0) / 2);
  const tryRadius = Math.max(1, (ty1 - ty0) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      const inGrown = x >= gx0 && x <= gx1 && y >= gy0 && y <= gy1;
      const normDx = (x - tcx) / trx;
      const normDy = (y - tcy) / tryRadius;
      const inTightSilhouette =
        x >= tx0 &&
        x <= tx1 &&
        y >= ty0 &&
        y <= ty1 &&
        normDx * normDx + normDy * normDy <= 1.08;

      if (inTightSilhouette) {
        // H3GreyMannequins: light grey `0.45 + 0.45 * luma` so the original face and clothes cannot leak back.
        const greyVal = openJutsuGreyByte(luma / 255);
        mannequinBuf[idx] = greyVal;
        mannequinBuf[idx + 1] = greyVal;
        mannequinBuf[idx + 2] = greyVal;

        // Tracked person (orange: 255, 140, 0 at 0.35 opacity)
        maskPreviewBuf[idx] = Math.round(r * 0.65 + 255 * 0.35);
        maskPreviewBuf[idx + 1] = Math.round(g * 0.65 + 140 * 0.35);
        maskPreviewBuf[idx + 2] = Math.round(b * 0.65 + 0 * 0.35);
      } else if (inGrown) {
        // Regenerated area (cyan: 0, 200, 255 at 0.45 opacity)
        maskPreviewBuf[idx] = Math.round(r * 0.55 + 0 * 0.45);
        maskPreviewBuf[idx + 1] = Math.round(g * 0.55 + 200 * 0.45);
        maskPreviewBuf[idx + 2] = Math.round(b * 0.55 + 255 * 0.45);
      }
    }
  }

  const [mannequinJpeg, leftMaskPng, rightMannequinPng] = await Promise.all([
    sharp(mannequinBuf, { raw: { width, height, channels } })
      .jpeg({ quality: 86 })
      .toBuffer(),
    sharp(maskPreviewBuf, { raw: { width, height, channels } })
      .png()
      .toBuffer(),
    sharp(mannequinBuf, { raw: { width, height, channels } })
      .png()
      .toBuffer(),
  ]);

  // Stitch side-by-side (`Mask | Mannequin`) matching `workflows/mask.api.json` node 17
  const checkMaskJpeg = await sharp({
    create: {
      width: width * 2 + 4,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: leftMaskPng, left: 0, top: 0 },
      { input: rightMannequinPng, left: width + 4, top: 0 },
    ])
    .jpeg({ quality: 84 })
    .toBuffer();

  return { mannequinJpeg, checkMaskJpeg };
}

/**
 * One raw SAM mask painted as an Openjutsu grey mannequin.
 * Subject mode greys the person. Background mode flips the person mask, then grows it (`flip_input`).
 */
export async function renderGreyMannequinAndMaskFrameFromMask(input: {
  frameBuffer: Buffer;
  mask: Uint8Array;
  margin: JutsuMaskMargin;
  maskMode?: JutsuMannequinMaskMode;
}): Promise<{ mannequinJpeg: Buffer; checkMaskJpeg: Buffer }> {
  const meta = await sharp(input.frameBuffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height || input.mask.length < width * height) {
    throw new Error("SAM mask size does not match frame dimensions");
  }
  const painted = masksForMannequinFrame({
    rawMask: input.mask,
    width,
    height,
    margin: input.margin,
    maskMode: input.maskMode ?? "subject",
  });
  return paintOpenJutsuMannequinFrame({
    frameBuffer: input.frameBuffer,
    greyMask: painted.greyMask,
    size: painted.size,
    editMask: painted.editMask,
    trackedMask: painted.trackedMask,
  });
}

/** Build the grey, cyan, and orange masks for one frame from a raw person mask. */
function masksForMannequinFrame(input: {
  rawMask: Uint8Array;
  width: number;
  height: number;
  margin: JutsuMaskMargin;
  maskMode: JutsuMannequinMaskMode;
}): {
  greyMask: Uint8Array;
  size: Float32Array;
  editMask: Uint8Array;
  trackedMask: Uint8Array;
} {
  const person = applyPeopleMask(input.rawMask, input.width, input.height, 0);
  const expandPx = mannequinExpandPixels(JUTSU_MARGINS[input.margin], input.width, input.height);
  const headed = fillMaskHoles(
    applyPeopleMask(input.rawMask, input.width, input.height, JUTSU_EDIT_HEADROOM).mask,
    input.width,
    input.height,
  );
  const grown =
    input.maskMode === "background"
      ? dilateMask(invertMask(headed), input.width, input.height, expandPx)
      : dilateMask(headed, input.width, input.height, expandPx);

  if (input.maskMode === "background") {
    // flip_input first, then grow: the grey area is the background plus a rim into the person.
    const size = new Float32Array(grown.length);
    for (let i = 0; i < grown.length; i++) {
      if (grown[i]) size[i] = 1;
    }
    const tracked = new Uint8Array(person.mask.length);
    for (let i = 0; i < tracked.length; i++) {
      if (person.mask[i] && !grown[i]) tracked[i] = 1;
    }
    return { greyMask: grown, size, editMask: grown, trackedMask: tracked };
  }

  return {
    greyMask: person.mask,
    size: person.size,
    editMask: grown,
    trackedMask: person.mask,
  };
}

/** Map Jutsu target text to a short fal SAM noun phrase. */
export function falSamPromptForTarget(target: string): string {
  const raw = (target || "").trim();
  const lower = raw.toLowerCase();
  if (!raw || /^(person|people|human|man|woman|character|人|人物|主角)/.test(lower)) {
    return "person";
  }
  if (/^[\x20-\x7e]+$/.test(raw) && raw.split(/\s+/).length <= 6) {
    return raw;
  }
  return "person";
}

/**
 * Generate both:
 * 1. `mannequinVideoMp4`: The 24fps Grey Mannequin motion-reference video (`H3GreyMannequins`) that MiniMax H3 `ref2va` (`reference_video`) follows frame-by-frame.
 * 2. `checkMaskVideoMp4`: The 24fps side-by-side `Check Mask (cyan/orange) | Grey Mannequin` preview video (`workflows/mask.api.json`).
 *
 * Uses fal `sam-3/video-rle` pixel masks exclusively (never Gemini/VLM bounding-box surrogates).
 */
export async function buildSam3MannequinAndMaskVideos(input: {
  sourceVideoBuffer: Buffer;
  sectionStart: number;
  sectionLength: number;
  target: string;
  margin: JutsuMaskMargin;
  hatFix: boolean;
  motionSize: JutsuMotionSize;
  /** `background` keeps the person and greys the surroundings (Teleport / object background). */
  maskMode?: JutsuMannequinMaskMode;
  manualBox?: JutsuPlacementBox;
  personMappings?: readonly JutsuPersonMapping[];
  allDetectedAnchors?: readonly JutsuPersonAnchor[];
}): Promise<{
  mannequinVideoBuffer: Buffer;
  checkMaskVideoBuffer: Buffer;
  /** Frame-0 fal SAM person mask (null when frame 0 had no person). */
  firstSubjectMask: { mask: Uint8Array; width: number; height: number } | null;
}> {
  if (!hasFalKey()) {
    throw new Error("尚未設定 FAL_KEY，無法執行 FAL SAM 3 分割");
  }

  const dir = await mkdtemp(join(tmpdir(), "jutsu-sam-mannequin-"));
  const framesDir = join(dir, "frames");
  const mannDir = join(dir, "mann");
  const maskDir = join(dir, "mask");

  try {
    await writeFile(join(dir, "in.mp4"), input.sourceVideoBuffer);
    await runFfmpeg(dir, ["-y", "-i", "in.mp4", "-f", "null", "-"]).catch(() => {});
    const probe = await ffmpegStderr(dir, ["-i", "in.mp4"]);
    const hasAudio = /Audio:/.test(probe);

    await Promise.all([
      import("node:fs/promises").then((fs) => fs.mkdir(framesDir, { recursive: true })),
      import("node:fs/promises").then((fs) => fs.mkdir(mannDir, { recursive: true })),
      import("node:fs/promises").then((fs) => fs.mkdir(maskDir, { recursive: true })),
    ]);

    const sectionStart = Math.max(0, input.sectionStart);
    const sectionLength = Math.max(1, input.sectionLength);
    // SAM tracks at 1008 px. The grey reference H3 follows is a separate scale (`motionSize`).
    const encodeSection = (fileName: string, longEdge: number) =>
      runFfmpeg(dir, [
        "-y",
        "-ss",
        sectionStart.toFixed(2),
        "-t",
        sectionLength.toFixed(2),
        "-i",
        "in.mp4",
        "-vf",
        jutsuLongEdgeScaleFilter(longEdge),
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        fileName,
      ]);
    await encodeSection("section-sam.mp4", JUTSU_SAM_LONG_EDGE);
    await encodeSection("section-motion.mp4", input.motionSize || 512);

    await runFfmpeg(dir, [
      "-y",
      "-i",
      "section-motion.mp4",
      join(framesDir, "f-%04d.jpg"),
    ]);
    await runFfmpeg(dir, ["-y", "-i", "section-sam.mp4", "-frames:v", "1", "sam-size.jpg"]);

    const files = (await readdir(framesDir))
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    if (files.length === 0) {
      throw new Error("無法由來源影片擷取畫格");
    }

    const frameBuffers = await Promise.all(
      files.map((f) => readFile(join(framesDir, f))),
    );

    const samMeta = await sharp(await readFile(join(dir, "sam-size.jpg"))).metadata();
    const samWidth = samMeta.width || 0;
    const samHeight = samMeta.height || 0;
    if (!samWidth || !samHeight) {
      throw new Error("無法讀取 SAM 畫格尺寸");
    }

    let firstSubjectMask: { mask: Uint8Array; width: number; height: number } | null = null;
    await renderMannequinFramesWithFal({
      sectionPath: join(dir, "section-sam.mp4"),
      frameBuffers,
      samWidth,
      samHeight,
      mannDir,
      maskDir,
      target: input.target,
      margin: input.margin,
      maskMode: input.maskMode ?? "subject",
      manualBox: input.manualBox,
      personMappings: input.personMappings,
      allDetectedAnchors: input.allDetectedAnchors,
      onFirstMask: (mask, width, height) => {
        firstSubjectMask = { mask, width, height };
      },
    });

    // Encode Mannequin Motion Reference MP4 (with source audio when present)
    const mannArgs = [
      "-y",
      "-framerate",
      "24",
      "-i",
      join(mannDir, "f-%04d.jpg"),
    ];
    if (hasAudio) {
      mannArgs.push(
        "-ss",
        sectionStart.toFixed(2),
        "-t",
        sectionLength.toFixed(2),
        "-i",
        "in.mp4",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0?",
        "-c:a",
        "aac",
        "-shortest",
      );
    }
    mannArgs.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "19",
      "-movflags",
      "+faststart",
      "mannequin.mp4",
    );
    await runFfmpeg(dir, mannArgs);

    await runFfmpeg(dir, [
      "-y",
      "-framerate",
      "24",
      "-i",
      join(maskDir, "f-%04d.jpg"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-movflags",
      "+faststart",
      "check-mask.mp4",
    ]);

    const [mannequinVideoBuffer, checkMaskVideoBuffer] = await Promise.all([
      readFile(join(dir, "mannequin.mp4")),
      readFile(join(dir, "check-mask.mp4")),
    ]);

    return { mannequinVideoBuffer, checkMaskVideoBuffer, firstSubjectMask };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Pick one fal RLE string when the returned frame count does not match the motion frames. */
function rleStringAt(rleFrames: readonly string[], index: number, frameCount: number): string {
  if (rleFrames.length === 0) return "";
  if (index < rleFrames.length && rleFrames[index]) return rleFrames[index]!;
  const mapped = Math.min(
    rleFrames.length - 1,
    Math.floor((index / Math.max(1, frameCount - 1)) * (rleFrames.length - 1)),
  );
  return rleFrames[mapped] ?? "";
}

function unionSizedPeople(
  parts: readonly { mask: Uint8Array; size: Float32Array }[],
): { mask: Uint8Array; size: Float32Array } {
  if (parts.length === 0) return { mask: new Uint8Array(), size: new Float32Array() };
  const mask = new Uint8Array(parts[0]!.mask.length);
  const size = new Float32Array(mask.length);
  for (const part of parts) {
    for (let i = 0; i < mask.length; i++) {
      if (!part.mask[i]) continue;
      mask[i] = 1;
      if (part.size[i]! > size[i]!) size[i] = part.size[i]!;
    }
  }
  return { mask, size };
}

/** Render grey mannequin frames exclusively from fal SAM 3 RLE pixel masks. */
async function renderMannequinFramesWithFal(input: {
  sectionPath: string;
  frameBuffers: Buffer[];
  samWidth: number;
  samHeight: number;
  mannDir: string;
  maskDir: string;
  target: string;
  margin: JutsuMaskMargin;
  maskMode: JutsuMannequinMaskMode;
  manualBox?: JutsuPlacementBox;
  personMappings?: readonly JutsuPersonMapping[];
  allDetectedAnchors?: readonly JutsuPersonAnchor[];
  /** Called once with the frame-0 person mask at SAM resolution. */
  onFirstMask?: (mask: Uint8Array, width: number, height: number) => void;
}): Promise<void> {
  const meta = await sharp(input.frameBuffers[0]!).metadata();
  const frameW = meta.width || 0;
  const frameH = meta.height || 0;
  if (!frameW || !frameH) {
    throw new Error("無法讀取來源畫格尺寸");
  }

  const sectionBuffer = await readFile(input.sectionPath);
  const mappings = input.personMappings?.filter((m) => Boolean(m.referenceImageUrl)) ?? [];
  const samW = input.samWidth;
  const samH = input.samHeight;

  let rleFrameSets: string[][];
  if (mappings.length > 0) {
    const anchors =
      input.allDetectedAnchors && input.allDetectedAnchors.length > 0
        ? input.allDetectedAnchors
        : mappings.map((m) => ({ objectId: m.objectId, anchorPoint: m.anchorPoint }));

    const sets = await Promise.all(
      mappings.map(async (m) => {
        const pointPrompts: FalSam3PointPrompt[] = [
          {
            x: Math.round(m.anchorPoint.x * samW),
            y: Math.round(m.anchorPoint.y * samH),
            label: 1,
            frame_index: 0,
            object_id: m.objectId,
          },
          ...anchors
            .filter((other) => other.objectId !== m.objectId)
            .map(
              (other): FalSam3PointPrompt => ({
                x: Math.round(other.anchorPoint.x * samW),
                y: Math.round(other.anchorPoint.y * samH),
                label: 0,
                frame_index: 0,
                object_id: m.objectId,
              }),
            ),
        ];

        const { rleFrames } = await segmentVideoWithFalSam3Rle({
          videoBuffer: sectionBuffer,
          fileName: `jutsu-section-p${m.personIndex}.mp4`,
          prompt: "person",
          detectionThreshold: 0.35,
          pointPrompts,
        });
        return rleFrames;
      }),
    );
    rleFrameSets = sets;
  } else {
    const boxPrompts = input.manualBox
      ? [
          {
            x_min: Math.round(input.manualBox.x * samW),
            y_min: Math.round(input.manualBox.y * samH),
            x_max: Math.round((input.manualBox.x + input.manualBox.width) * samW),
            y_max: Math.round((input.manualBox.y + input.manualBox.height) * samH),
            frame_index: 0,
            object_id: 0,
          },
        ]
      : [];

    const { rleFrames } = await segmentVideoWithFalSam3Rle({
      videoBuffer: sectionBuffer,
      fileName: "jutsu-section.mp4",
      prompt: falSamPromptForTarget(input.target),
      detectionThreshold: 0.35,
      boxPrompts,
    });
    rleFrameSets = [rleFrames];
  }

  const frameCount = input.frameBuffers.length;
  const motionTimelines: Uint8Array[][] = rleFrameSets.map(() => []);
  const firstSamMasks: Uint8Array[] = [];
  for (let sIdx = 0; sIdx < rleFrameSets.length; sIdx++) {
    const rleFrames = rleFrameSets[sIdx]!;
    for (let i = 0; i < frameCount; i++) {
      const samMask = decodeFalSparseRle(rleStringAt(rleFrames, i, frameCount), samW, samH);
      if (i === 0) firstSamMasks.push(samMask);
      motionTimelines[sIdx]!.push(
        samW === frameW && samH === frameH
          ? samMask
          : resizeBinaryMaskNearest(samMask, samW, samH, frameW, frameH),
      );
    }
  }

  const firstUnion =
    firstSamMasks.length === 1
      ? firstSamMasks[0]!
      : unionBinaryMasks(firstSamMasks, samW * samH);
  if (maskHasForeground(firstUnion)) {
    input.onFirstMask?.(Uint8Array.from(firstUnion), samW, samH);
  }

  // Hold is per person, then the people are joined. A missing fal frame stays empty outside that window.
  const heldMannequin = motionTimelines.map((timeline) =>
    holdMasksOverTime(timeline, JUTSU_MANNEQUIN_HOLD_FRAMES),
  );
  const heldEdit = motionTimelines.map((timeline) =>
    holdMasksOverTime(timeline, JUTSU_EDIT_HOLD_FRAMES),
  );
  const expandPx = mannequinExpandPixels(JUTSU_MARGINS[input.margin], frameW, frameH);

  for (let i = 0; i < frameCount; i++) {
    const mannequin = unionSizedPeople(
      heldMannequin.map((timeline) => applyPeopleMask(timeline[i]!, frameW, frameH, 0)),
    );
    const editPeople = unionSizedPeople(
      heldEdit.map((timeline) =>
        applyPeopleMask(timeline[i]!, frameW, frameH, JUTSU_EDIT_HEADROOM),
      ),
    );
    const solidPerson = fillMaskHoles(editPeople.mask, frameW, frameH);
    // Background flips first, then grows, so the grey rim bites into the person instead of leaving an old-background halo.
    const grown =
      input.maskMode === "background"
        ? dilateMask(invertMask(solidPerson), frameW, frameH, expandPx)
        : dilateMask(solidPerson, frameW, frameH, expandPx);

    let greyMask = mannequin.mask;
    let size = mannequin.size;
    let editMask = grown;
    let trackedMask = mannequin.mask;
    if (input.maskMode === "background") {
      greyMask = grown;
      size = new Float32Array(greyMask.length);
      for (let p = 0; p < greyMask.length; p++) {
        if (greyMask[p]) size[p] = 1;
      }
      editMask = greyMask;
      trackedMask = new Uint8Array(mannequin.mask.length);
      for (let p = 0; p < trackedMask.length; p++) {
        if (mannequin.mask[p] && !greyMask[p]) trackedMask[p] = 1;
      }
    }

    const rendered = await paintOpenJutsuMannequinFrame({
      frameBuffer: input.frameBuffers[i]!,
      greyMask,
      size,
      editMask,
      trackedMask,
    });
    const num = String(i + 1).padStart(4, "0");
    await Promise.all([
      writeFile(join(input.mannDir, `f-${num}.jpg`), rendered.mannequinJpeg),
      writeFile(join(input.maskDir, `f-${num}.jpg`), rendered.checkMaskJpeg),
    ]);
  }
}
