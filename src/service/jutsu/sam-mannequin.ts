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
import {
  decodeFalSparseRle,
  normalizedBBoxFromMask,
  resizeBinaryMaskNearest,
  unionBinaryMasks,
} from "@/service/fal/rle";
import {
  type FalSam3PointPrompt,
  segmentVideoWithFalSam3Rle,
} from "@/service/fal/sam3-video";
import { assertOpenRouterKey, OPENROUTER_BASE_URL } from "@/service/openrouter/generate";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";

export const JUTSU_MARGINS = {
  tight: 20,
  normal: 40,
  loose: 60,
} as const;

export type JutsuMaskMargin = keyof typeof JUTSU_MARGINS;

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
        // H3GreyMannequins: neutral mid-grey mannequin preserving crisp mouth/eye/limb shading contours
        const greyVal = Math.min(225, Math.max(50, Math.round(118 + (luma - 128) * 0.75)));
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
 * Pixel-accurate grey mannequin from a binary SAM mask (row-major `width*height`).
 * Grown cyan area uses the expanded bbox of the mask (Openjutsu headroom + margin).
 */
export async function renderGreyMannequinAndMaskFrameFromMask(input: {
  frameBuffer: Buffer;
  mask: Uint8Array;
  margin: JutsuMaskMargin;
}): Promise<{ mannequinJpeg: Buffer; checkMaskJpeg: Buffer }> {
  const { data, info } = await sharp(input.frameBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (input.mask.length < width * height) {
    throw new Error("SAM mask size does not match frame dimensions");
  }

  const tightBox =
    normalizedBBoxFromMask(input.mask, width, height) || {
      x: 0.2,
      y: 0.1,
      width: 0.6,
      height: 0.85,
    };
  const grownBox = expandTrackedBoxWithHeadroomAndMargin(tightBox, {
    headroom: 0.1,
    margin: input.margin,
  });

  const mannequinBuf = Buffer.from(data);
  const maskPreviewBuf = Buffer.from(data);

  const gx0 = Math.floor(grownBox.x * width);
  const gy0 = Math.floor(grownBox.y * height);
  const gx1 = Math.ceil((grownBox.x + grownBox.width) * width);
  const gy1 = Math.ceil((grownBox.y + grownBox.height) * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const inMask = Boolean(input.mask[y * width + x]);
      const inGrown = x >= gx0 && x <= gx1 && y >= gy0 && y <= gy1;

      if (inMask) {
        const greyVal = Math.min(225, Math.max(50, Math.round(118 + (luma - 128) * 0.75)));
        mannequinBuf[idx] = greyVal;
        mannequinBuf[idx + 1] = greyVal;
        mannequinBuf[idx + 2] = greyVal;
        maskPreviewBuf[idx] = Math.round(r * 0.65 + 255 * 0.35);
        maskPreviewBuf[idx + 1] = Math.round(g * 0.65 + 140 * 0.35);
        maskPreviewBuf[idx + 2] = Math.round(b * 0.65 + 0 * 0.35);
      } else if (inGrown) {
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

/** Detect the target's normalized bounding box across sampled frames via OpenRouter VLM. */
export async function detectTargetTrackBoxesViaOpenRouter(input: {
  sampledFrames: Array<{ frameIndex: number; buffer: Buffer }>;
  target: string;
  hatFix?: boolean;
}): Promise<TrackedMaskBox[]> {
  if (input.sampledFrames.length === 0) return [];
  try {
    const key = assertOpenRouterKey();
    const content: Array<
      | { type: "image_url"; image_url: { url: string } }
      | { type: "text"; text: string }
    > = [];

    for (const item of input.sampledFrames) {
      const thumb = await sharp(item.buffer)
        .resize(512, 512, { fit: "inside" })
        .jpeg({ quality: 78 })
        .toBuffer();
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${thumb.toString("base64")}` },
      });
    }

    const targetDesc = input.hatFix
      ? `${input.target || "person"} (including their hat)`
      : input.target || "person";

    content.push({
      type: "text",
      text: `For each of the ${input.sampledFrames.length} attached frames in order, locate the main "${targetDesc}" (the largest one in frame). Return ONLY a JSON array of objects with normalized [0..1] coordinates: [{"x":0.22,"y":0.12,"width":0.56,"height":0.82}, ...].`,
    });

    const res = await fetch(`${OPENROUTER_BASE_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_JUTSU_VLM_MODEL || "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a precision object/person bounding-box tracker (SAM 3.1 surrogate). Output ONLY valid JSON array of {x, y, width, height} in [0..1] normalized coordinates.",
          },
          { role: "user", content },
        ],
        temperature: 0.1,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) return [];
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = body.choices?.[0]?.message?.content || "";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }>;

    return input.sampledFrames.map((sample, idx) => {
      const box = parsed[idx] ?? parsed[parsed.length - 1] ?? {};
      const x = Math.min(0.9, Math.max(0, Number(box.x) || 0.2));
      const y = Math.min(0.9, Math.max(0, Number(box.y) || 0.1));
      const width = Math.min(1 - x, Math.max(0.1, Number(box.width) || 0.6));
      const height = Math.min(1 - y, Math.max(0.15, Number(box.height) || 0.85));
      return {
        frameIndex: sample.frameIndex,
        x,
        y,
        width,
        height,
      };
    });
  } catch {
    return [];
  }
}

/** Minimum share of frames that must carry a non-empty fal mask before we accept SAM. */
const FAL_SAM_MIN_COVERAGE = 0.2;

/**
 * Generate both:
 * 1. `mannequinVideoMp4`: The 24fps Grey Mannequin motion-reference video (`H3GreyMannequins`) that MiniMax H3 `ref2va` (`reference_video`) follows frame-by-frame.
 * 2. `checkMaskVideoMp4`: The 24fps side-by-side `Check Mask (cyan/orange) | Grey Mannequin` preview video (`workflows/mask.api.json`).
 *
 * Prefer fal `sam-3/video-rle` pixel masks when `FAL_KEY` is set; fall back to the OpenRouter VLM bbox ellipse surrogate.
 */
export async function buildSam3MannequinAndMaskVideos(input: {
  sourceVideoBuffer: Buffer;
  sectionStart: number;
  sectionLength: number;
  target: string;
  margin: JutsuMaskMargin;
  hatFix: boolean;
  motionSize: JutsuMotionSize;
  manualBox?: JutsuPlacementBox;
  personMappings?: readonly JutsuPersonMapping[];
  allDetectedAnchors?: readonly JutsuPersonAnchor[];
}): Promise<{
  mannequinVideoBuffer: Buffer;
  checkMaskVideoBuffer: Buffer;
  /** Frame-0 fal SAM person mask (null when fal was not used or frame 0 had no person). */
  firstSubjectMask: { mask: Uint8Array; width: number; height: number } | null;
}> {
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

    const scaleEdge = Math.min(768, input.motionSize || 512);
    const scaleFilter = `fps=24,scale='if(gt(iw,ih),${scaleEdge},-2)':'if(gt(iw,ih),-2,${scaleEdge})'`;

    // Encode a section clip first so fal RLE frames line up 1:1 with extracted JPEGs.
    await runFfmpeg(dir, [
      "-y",
      "-ss",
      String(Math.max(0, input.sectionStart).toFixed(2)),
      "-t",
      String(Math.max(1, input.sectionLength).toFixed(2)),
      "-i",
      "in.mp4",
      "-vf",
      scaleFilter,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      "section.mp4",
    ]);

    await runFfmpeg(dir, [
      "-y",
      "-i",
      "section.mp4",
      join(framesDir, "f-%04d.jpg"),
    ]);

    const files = (await readdir(framesDir))
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    if (files.length === 0) {
      throw new Error("無法由來源影片擷取畫格");
    }

    const frameBuffers = await Promise.all(
      files.map((f) => readFile(join(framesDir, f))),
    );

    // Only the fal SAM loop may fill this; VLM ellipses are not a real cutout.
    let firstSubjectMask: { mask: Uint8Array; width: number; height: number } | null = null;
    const usedFal = await tryRenderMannequinFramesWithFal({
      sectionPath: join(dir, "section.mp4"),
      frameBuffers,
      mannDir,
      maskDir,
      target: input.target,
      margin: input.margin,
      manualBox: input.manualBox,
      personMappings: input.personMappings,
      allDetectedAnchors: input.allDetectedAnchors,
      onFirstMask: (mask, width, height) => {
        firstSubjectMask = { mask, width, height };
      },
    });

    if (!usedFal) {
      // fal failed midway: drop any partial capture so the mask matches the VLM fallback path.
      firstSubjectMask = null;
      await renderMannequinFramesWithVlmBoxes({
        frameBuffers,
        mannDir,
        maskDir,
        target: input.target,
        margin: input.margin,
        hatFix: input.hatFix,
        manualBox: input.manualBox,
      });
    }

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
        String(Math.max(0, input.sectionStart).toFixed(2)),
        "-t",
        String(Math.max(1, input.sectionLength).toFixed(2)),
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

/** fal SAM 3 pixel masks → grey mannequin frames. Returns false to trigger VLM fallback. */
async function tryRenderMannequinFramesWithFal(input: {
  sectionPath: string;
  frameBuffers: Buffer[];
  mannDir: string;
  maskDir: string;
  target: string;
  margin: JutsuMaskMargin;
  manualBox?: JutsuPlacementBox;
  personMappings?: readonly JutsuPersonMapping[];
  allDetectedAnchors?: readonly JutsuPersonAnchor[];
  /** Called once with the frame-0 person mask when it has at least one positive value. */
  onFirstMask?: (mask: Uint8Array, width: number, height: number) => void;
}): Promise<boolean> {
  if (!hasFalKey()) return false;

  try {
    const meta = await sharp(input.frameBuffers[0]!).metadata();
    const frameW = meta.width || 0;
    const frameH = meta.height || 0;
    if (!frameW || !frameH) return false;

    const sectionBuffer = await readFile(input.sectionPath);
    const mappings = input.personMappings?.filter((m) => Boolean(m.referenceImageUrl)) ?? [];

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
              x: Math.round(m.anchorPoint.x * frameW),
              y: Math.round(m.anchorPoint.y * frameH),
              label: 1,
              frame_index: 0,
              object_id: m.objectId,
            },
            ...anchors
              .filter((other) => other.objectId !== m.objectId)
              .map(
                (other): FalSam3PointPrompt => ({
                  x: Math.round(other.anchorPoint.x * frameW),
                  y: Math.round(other.anchorPoint.y * frameH),
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
            detectionThreshold: 0.45,
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
              x_min: Math.round(input.manualBox.x * frameW),
              y_min: Math.round(input.manualBox.y * frameH),
              x_max: Math.round((input.manualBox.x + input.manualBox.width) * frameW),
              y_max: Math.round((input.manualBox.y + input.manualBox.height) * frameH),
              frame_index: 0,
              object_id: 0,
            },
          ]
        : [];

      const { rleFrames } = await segmentVideoWithFalSam3Rle({
        videoBuffer: sectionBuffer,
        fileName: "jutsu-section.mp4",
        prompt: falSamPromptForTarget(input.target),
        detectionThreshold: 0.45,
        boxPrompts,
      });
      rleFrameSets = [rleFrames];
    }

    const primaryFrames = rleFrameSets[0] || [];
    const nonEmpty = primaryFrames.filter((s) => (s || "").trim().length > 0).length;
    if (nonEmpty < Math.max(1, Math.floor(input.frameBuffers.length * FAL_SAM_MIN_COVERAGE))) {
      console.warn(
        `[jutsu/sam] fal SAM coverage too low (${nonEmpty}/${input.frameBuffers.length}); falling back to VLM bbox`,
      );
      return false;
    }

    // fal may return source-fps count; align by index, carrying forward the last good mask per person.
    const lastMasks: Array<Uint8Array | null> = rleFrameSets.map(() => null);
    const falW = frameW;
    const falH = frameH;

    for (let i = 0; i < input.frameBuffers.length; i++) {
      const perPersonMasks: Uint8Array[] = [];
      for (let sIdx = 0; sIdx < rleFrameSets.length; sIdx++) {
        const rleFrames = rleFrameSets[sIdx]!;
        const rle =
          rleFrames[i] ??
          rleFrames[
            Math.min(
              rleFrames.length - 1,
              Math.floor((i / Math.max(1, input.frameBuffers.length - 1)) * (rleFrames.length - 1)),
            )
          ] ??
          "";
        let m = decodeFalSparseRle(rle, falW, falH);
        if (m.length !== frameW * frameH) {
          m = resizeBinaryMaskNearest(m, falW, falH, frameW, frameH);
        }
        if (!m.some((v) => v)) {
          m = lastMasks[sIdx] ? Uint8Array.from(lastMasks[sIdx]!) : m;
        } else {
          lastMasks[sIdx] = m;
        }
        perPersonMasks.push(m);
      }

      const mask =
        perPersonMasks.length === 1
          ? perPersonMasks[0]!
          : unionBinaryMasks(perPersonMasks, frameW * frameH);

      if (i === 0 && mask.some((value) => value > 0)) {
        input.onFirstMask?.(Uint8Array.from(mask), frameW, frameH);
      }

      const rendered = await renderGreyMannequinAndMaskFrameFromMask({
        frameBuffer: input.frameBuffers[i]!,
        mask,
        margin: input.margin,
      });
      const num = String(i + 1).padStart(4, "0");
      await Promise.all([
        writeFile(join(input.mannDir, `f-${num}.jpg`), rendered.mannequinJpeg),
        writeFile(join(input.maskDir, `f-${num}.jpg`), rendered.checkMaskJpeg),
      ]);
    }
    return true;
  } catch (err) {
    console.warn(
      `[jutsu/sam] fal SAM failed; falling back to VLM bbox: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

/** Legacy OpenRouter VLM bbox → ellipse grey mannequin frames. */
async function renderMannequinFramesWithVlmBoxes(input: {
  frameBuffers: Buffer[];
  mannDir: string;
  maskDir: string;
  target: string;
  margin: JutsuMaskMargin;
  hatFix: boolean;
  manualBox?: JutsuPlacementBox;
}): Promise<void> {
  let trackedKeyframes: TrackedMaskBox[];
  if (input.manualBox) {
    trackedKeyframes = [
      {
        frameIndex: 0,
        x: input.manualBox.x,
        y: input.manualBox.y,
        width: input.manualBox.width,
        height: input.manualBox.height,
      },
    ];
  } else {
    const sampleIndices = Array.from(
      new Set([
        0,
        Math.floor((input.frameBuffers.length - 1) * 0.33),
        Math.floor((input.frameBuffers.length - 1) * 0.66),
        input.frameBuffers.length - 1,
      ]),
    );
    trackedKeyframes = await detectTargetTrackBoxesViaOpenRouter({
      sampledFrames: sampleIndices.map((idx) => ({
        frameIndex: idx,
        buffer: input.frameBuffers[idx]!,
      })),
      target: input.target,
      hatFix: input.hatFix,
    });
  }

  const perFrameTight = interpolateTrackedBoxes(
    trackedKeyframes,
    input.frameBuffers.length,
  );

  for (let i = 0; i < input.frameBuffers.length; i++) {
    const tight = perFrameTight[i]!;
    const grown = expandTrackedBoxWithHeadroomAndMargin(tight, {
      headroom: 0.1,
      margin: input.margin,
    });
    const rendered = await renderGreyMannequinAndMaskFrame({
      frameBuffer: input.frameBuffers[i]!,
      tightBox: tight,
      grownBox: grown,
    });
    const num = String(i + 1).padStart(4, "0");
    await Promise.all([
      writeFile(join(input.mannDir, `f-${num}.jpg`), rendered.mannequinJpeg),
      writeFile(join(input.maskDir, `f-${num}.jpg`), rendered.checkMaskJpeg),
    ]);
  }
}
