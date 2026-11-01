import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type { JutsuPlacementBox } from "@/model/jutsu-job";
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
        // H3GreyMannequins: neutral mid-grey mannequin preserving pose/limb shading contours
        const greyVal = Math.min(200, Math.max(85, Math.round(115 + (luma - 128) * 0.45)));
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

/**
 * Generate both:
 * 1. `mannequinVideoMp4`: The 24fps Grey Mannequin motion-reference video (`H3GreyMannequins`) that MiniMax H3 `ref2va` (`reference_video`) follows frame-by-frame.
 * 2. `checkMaskVideoMp4`: The 24fps side-by-side `Check Mask (cyan/orange) | Grey Mannequin` preview video (`workflows/mask.api.json`).
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
}): Promise<{
  mannequinVideoBuffer: Buffer;
  checkMaskVideoBuffer: Buffer;
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
    await runFfmpeg(dir, [
      "-y",
      "-ss",
      String(Math.max(0, input.sectionStart).toFixed(2)),
      "-t",
      String(Math.max(1, input.sectionLength).toFixed(2)),
      "-i",
      "in.mp4",
      "-vf",
      `fps=24,scale='if(gt(iw,ih),${scaleEdge},-2)':'if(gt(iw,ih),-2,${scaleEdge})'`,
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
          Math.floor(( frameBuffers.length - 1) * 0.33),
          Math.floor((frameBuffers.length - 1) * 0.66),
          frameBuffers.length - 1,
        ]),
      );
      trackedKeyframes = await detectTargetTrackBoxesViaOpenRouter({
        sampledFrames: sampleIndices.map((idx) => ({
          frameIndex: idx,
          buffer: frameBuffers[idx]!,
        })),
        target: input.target,
        hatFix: input.hatFix,
      });
    }

    const perFrameTight = interpolateTrackedBoxes(
      trackedKeyframes,
      frameBuffers.length,
    );

    for (let i = 0; i < frameBuffers.length; i++) {
      const tight = perFrameTight[i]!;
      const grown = expandTrackedBoxWithHeadroomAndMargin(tight, {
        headroom: 0.1,
        margin: input.margin,
      });
      const rendered = await renderGreyMannequinAndMaskFrame({
        frameBuffer: frameBuffers[i]!,
        tightBox: tight,
        grownBox: grown,
      });
      const num = String(i + 1).padStart(4, "0");
      await Promise.all([
        writeFile(join(mannDir, `f-${num}.jpg`), rendered.mannequinJpeg),
        writeFile(join(maskDir, `f-${num}.jpg`), rendered.checkMaskJpeg),
      ]);
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

    // Encode Check Mask | Mannequin side-by-side preview MP4
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

    return { mannequinVideoBuffer, checkMaskVideoBuffer };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
