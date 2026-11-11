import { ObjectId } from "mongodb";
import sharp from "sharp";
import { generationJobsCollection, textStylesCollection, usersCollection, videosCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { OnscreenTextItem, Project, SceneTextLanguage } from "@/model/project";
import type { TextStyleDoc } from "@/model/text-style";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import {
  isSubtitleLook,
  lookLineForOnScreenVideo,
  subtitleLookLine,
  textStyleSampleLookLine,
} from "@/service/director/subtitle-look";
import {
  PLATE_EMPTY_ERROR,
  plateIsEmpty,
} from "@/service/director/subtitle-plate";
import {
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { submitImage } from "@/service/higgsfield/generate";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  comfyViewAuthHeaders,
  hasComfyEndpoint,
  isComfyPromptStatusUrl,
} from "@/service/comfy/openjutsu-client";
import { submitComfyMaskedTextInpaintVideo } from "@/service/comfy/submit-clip-video";
import { detectCenteredFaceSafeTextZone, type SafeTextBox } from "@/service/opencut/safe-text-zone";
import { extractVideoFrameJpeg, spliceVideoSection } from "@/service/opencut/splice-video-section";
import { resolveTextStyleLookLine } from "@/service/text-style/look-line";

const MAX_ON_SCREEN_TEXT_CHARS = 240;

export type ChromaKeyColor = {
  hex: "#FF00FF" | "#0055FF";
  name: string;
  rgb: { r: number; g: number; b: number };
};

export type GenerateOpencutOnScreenTextResult =
  | {
      ok: true;
      url: string;
      text: string;
      textStyleId: string;
    }
  | {
      ok: false;
      error: string;
    };

export type EnqueueOpencutOnScreenTextResult =
  | {
      ok: true;
      item: OnscreenTextItem;
      project: PublicVideo;
    }
  | {
      ok: false;
      error: string;
    };

// Detect CJK characters (Japanese Hiragana/Katakana, Korean Hangul, Chinese Hanzi) so on-screen text routes appropriately.
export function inferOnScreenTextSceneLanguage(text: string): SceneTextLanguage {
  if (/[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\uff65-\uff9f]/.test(text)) {
    return "ja";
  }
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text)) {
    return "ko";
  }
  if (/[\u3400-\u9fff\uf900-\ufaff]/.test(text)) {
    return "zh-Hant";
  }
  return "en";
}

// Pick a non-green chroma-key background color that contrasts with the selected style's palette.
// Torn Paper ("clean") and Chalk use green in the graphic itself, so green (#00FF00) is never used.
export function chooseOnScreenTextKeyColor(input?: {
  textStyleId?: string;
  lookLine?: string;
}): ChromaKeyColor {
  const id = (input?.textStyleId ?? "").toLowerCase();
  const look = (input?.lookLine ?? "").toLowerCase();
  if (
    id === "neon" ||
    id === "graffiti" ||
    id === "sticker" ||
    id === "glitch" ||
    /magenta|hot pink|pink|bright red/.test(look)
  ) {
    return {
      hex: "#0055FF",
      name: "solid cobalt blue",
      rgb: { r: 0, g: 85, b: 255 },
    };
  }
  return {
    hex: "#FF00FF",
    name: "solid bright magenta",
    rgb: { r: 255, g: 0, b: 255 },
  };
}

// Strip any "on a flat ... field/board" clause from a look line so the key background stays uniform.
function stripFieldBackgroundClause(lookLine: string): string {
  return lookLine
    .replace(/,?\s*(?:bright\s+)?(?:on|over)\s+a\s+flat\s+[^.]+(?=\.)/gi, "")
    .trim();
}

// Build the AI subtitle graphic prompt on a contrasting non-green key color background.
export function onScreenTextPrompt(input: {
  text: string;
  lookLine?: string;
  sampleImageIndex?: number;
  keyColor?: ChromaKeyColor;
}): string {
  const words = input.text.trim();
  const keyColor = input.keyColor ?? chooseOnScreenTextKeyColor({ lookLine: input.lookLine });
  const rawLook = input.sampleImageIndex
    ? textStyleSampleLookLine(input.sampleImageIndex)
    : input.lookLine?.trim() || subtitleLookLine();
  const look = stripFieldBackgroundClause(rawLook);
  return [
    "Subtitle graphic only. Large phone-readable lettering. No person, no room, no logo, no extra words.",
    look,
    `The only words are: ${words}`,
    "Include any paper strip, sticker, or stroke that belongs to the Look (keep every black, white, yellow, or bright green paper strip completely opaque and intact). Do not paint a full-bleed background scene.",
    `The outer background area around the graphic is flat ${keyColor.hex} (${keyColor.name}). Do not use green as the outer background. No pixel of the letters, paper strips, or sticker may be ${keyColor.hex}.`,
  ].join("\n");
}

// Build an in-scene redraw prompt that paints the selected artistic text style directly inside the SAM 3 safe box on Reference Image 1.
export function inSceneOnScreenTextPrompt(input: {
  text: string;
  lookLine?: string;
  sampleImageIndex?: number;
  box: SafeTextBox;
  width: number;
  height: number;
}): string {
  const words = input.text.trim();
  const rawLook = input.sampleImageIndex
    ? textStyleSampleLookLine(input.sampleImageIndex)
    : input.lookLine?.trim() || subtitleLookLine();
  const look = lookLineForOnScreenVideo(stripFieldBackgroundClause(rawLook));
  const w = Math.max(1, input.width);
  const h = Math.max(1, input.height);
  const xp = Math.round((input.box.x / w) * 100);
  const yp = Math.round((input.box.y / h) * 100);
  const wp = Math.round((input.box.w / w) * 100);
  const hp = Math.round((input.box.h / h) * 100);

  return [
    `Edit Reference Image 1 by seamlessly painting an on-screen artistic title graphic inside the target region (x=${xp}%, y=${yp}%, width=${wp}%, height=${hp}%).`,
    look,
    `The only words to paint inside that target region are: ${words}`,
    "Paint that phrase exactly once. Each word appears once. Do not copy words already printed in the scene.",
    "Integrate any torn-paper strips, sticker borders, brushstrokes, and contact shadows naturally into the lighting and depth of Reference Image 1.",
    "STRICT LOCK OUTSIDE TARGET BOX: Keep every human face, expression, hair, and all background details outside the target text region 100% pixel-identical to Reference Image 1.",
  ].join("\n");
}

// Detect the actual bounding box where `paintedFrame` differs strongly from `originalFrame`,
// falling back to `fallbackBox` if fewer than 64 pixels changed.
export async function computePaintedDiffBoundingBox(input: {
  originalFrame: Buffer;
  paintedFrame: Buffer;
  fallbackBox: SafeTextBox;
}): Promise<SafeTextBox> {
  const origMeta = await sharp(input.originalFrame)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = origMeta.info;
  const origData = origMeta.data;
  const paintedData = await sharp(input.paintedFrame)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i3 = (y * width + x) * 3;
      const diff = Math.hypot(
        (paintedData[i3] ?? 0) - (origData[i3] ?? 0),
        (paintedData[i3 + 1] ?? 0) - (origData[i3 + 1] ?? 0),
        (paintedData[i3 + 2] ?? 0) - (origData[i3 + 2] ?? 0),
      );
      if (diff >= 55) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  if (count < 64 || maxX <= minX || maxY <= minY) {
    return input.fallbackBox;
  }

  const pad = 16;
  const rx = Math.max(0, minX - pad);
  const ry = Math.max(0, minY - pad);
  const rw = Math.min(width - rx, maxX - minX + 1 + pad * 2);
  const rh = Math.min(height - ry, maxY - minY + 1 + pad * 2);
  return { x: rx, y: ry, w: rw, h: rh };
}

// Extract the painted artistic text inside `box` by comparing `paintedFrame` against `originalFrame` with soft edge feathering.
export async function extractFeatheredInSceneTextPatch(input: {
  originalFrame: Buffer;
  paintedFrame: Buffer;
  box: SafeTextBox;
}): Promise<{ patchPng: Buffer; ratio: number }> {
  const origMeta = await sharp(input.originalFrame)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = origMeta.info;
  const origData = origMeta.data;

  const paintedData = await sharp(input.paintedFrame)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4, 0);
  const { x: bx, y: by, w: bw, h: bh } = input.box;
  const featherPx = Math.max(6, Math.round(Math.min(bw, bh) * 0.08));
  let kept = 0;
  const boxArea = Math.max(1, bw * bh);

  const minX = Math.max(0, bx);
  const maxX = Math.min(width - 1, bx + bw);
  const minY = Math.max(0, by);
  const maxY = Math.min(height - 1, by + bh);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i3 = (y * width + x) * 3;
      const i4 = (y * width + x) * 4;
      const r0 = origData[i3] ?? 0;
      const g0 = origData[i3 + 1] ?? 0;
      const b0 = origData[i3 + 2] ?? 0;
      const r1 = paintedData[i3] ?? 0;
      const g1 = paintedData[i3 + 1] ?? 0;
      const b1 = paintedData[i3 + 2] ?? 0;

      const diff = Math.hypot(r1 - r0, g1 - g0, b1 - b0);
      if (diff <= 10) continue;

      let alpha01 = Math.min(1, (diff - 10) / 22);
      const edgeDist = Math.min(x - minX, maxX - x, y - minY, maxY - y);
      if (edgeDist < featherPx) {
        alpha01 *= edgeDist / featherPx;
      }
      const alphaByte = clampByte(alpha01 * 255);
      if (alphaByte < 12) continue;

      rgba[i4] = r1;
      rgba[i4 + 1] = g1;
      rgba[i4 + 2] = b1;
      rgba[i4 + 3] = alphaByte;
      if (alphaByte >= 64) kept++;
    }
  }

  const patchPng = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return { patchPng, ratio: kept / boxArea };
}

function clampByte(value: number): number {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

// Sample the actual background RGB from the outer border of the generated image.
function sampleBorderKeyColor(
  data: Buffer,
  width: number,
  height: number,
  target: { r: number; g: number; b: number },
): { r: number; g: number; b: number } {
  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];

  const pushIfMatch = (x: number, y: number) => {
    const idx = (y * width + x) * 3;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    const dist = Math.hypot(r - target.r, g - target.g, b - target.b);
    if (dist < 150) {
      rVals.push(r);
      gVals.push(g);
      bVals.push(b);
    }
  };

  for (let x = 0; x < width; x += 1) {
    pushIfMatch(x, 0);
    if (height > 1) pushIfMatch(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pushIfMatch(0, y);
    if (width > 1) pushIfMatch(width - 1, y);
  }

  if (rVals.length < 8) {
    return target;
  }

  rVals.sort((a, b) => a - b);
  gVals.sort((a, b) => a - b);
  bVals.sort((a, b) => a - b);
  const mid = Math.floor(rVals.length / 2);
  return {
    r: rVals[mid] ?? target.r,
    g: gVals[mid] ?? target.g,
    b: bVals[mid] ?? target.b,
  };
}

// Convert the contrasting key background into smooth alpha transparency using color-difference matting + despill.
// Preserves bright green paper strips (e.g. Torn Paper style) and removes colored edge fringes.
export async function keyColorDifferencePng(
  png: Buffer,
  keyColor: ChromaKeyColor = chooseOnScreenTextKeyColor(),
): Promise<{ png: Buffer; ratio: number }> {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = width * height;
  if (pixels === 0) {
    return { png, ratio: 0 };
  }

  const bg = sampleBorderKeyColor(data, width, height, keyColor.rgb);
  const isMagentaKey = keyColor.hex === "#FF00FF";
  const innerDist = 68;
  const outerDist = 148;

  const rgba = Buffer.alloc(pixels * 4);
  let kept = 0;

  for (let index = 0; index < pixels; index += 1) {
    const r = data[index * 3] ?? 0;
    const g = data[index * 3 + 1] ?? 0;
    const b = data[index * 3 + 2] ?? 0;
    const out = index * 4;

    const dist = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
    const keyDom = isMagentaKey
      ? Math.min(r, b) - g
      : b - Math.max(r, Math.round(g * 0.8));

    if (dist <= innerDist || keyDom >= 105) {
      rgba[out] = 0;
      rgba[out + 1] = 0;
      rgba[out + 2] = 0;
      rgba[out + 3] = 0;
      continue;
    }

    let alpha01 = 1;
    if (dist < outerDist) {
      alpha01 = Math.min(alpha01, (dist - innerDist) / (outerDist - innerDist));
    }
    if (keyDom > 24) {
      alpha01 = Math.min(alpha01, 1 - (keyDom - 24) / (105 - 24));
    }
    alpha01 = Math.max(0, Math.min(1, alpha01));

    if (alpha01 < 0.08) {
      rgba[out] = 0;
      rgba[out + 1] = 0;
      rgba[out + 2] = 0;
      rgba[out + 3] = 0;
      continue;
    }

    let fgR = r;
    let fgG = g;
    let fgB = b;

    if (alpha01 < 0.99) {
      const denom = Math.max(alpha01, 0.2);
      fgR = clampByte((r - (1 - alpha01) * bg.r) / denom);
      fgG = clampByte((g - (1 - alpha01) * bg.g) / denom);
      fgB = clampByte((b - (1 - alpha01) * bg.b) / denom);
    }

    if (isMagentaKey) {
      const spill = Math.min(fgR, fgB) - fgG;
      if (spill > 0) {
        fgR = clampByte(fgR - spill);
        fgB = clampByte(fgB - spill);
      }
    } else {
      const maxRG = Math.max(fgR, fgG);
      const spill = fgB - maxRG;
      if (spill > 0 && keyDom > 12) {
        fgB = clampByte(fgB - spill);
      }
    }

    const alphaByte = clampByte(alpha01 * 255);
    rgba[out] = fgR;
    rgba[out + 1] = fgG;
    rgba[out + 2] = fgB;
    rgba[out + 3] = alphaByte;
    if (alphaByte >= 64) {
      kept += 1;
    }
  }

  const keyed = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return { png: keyed, ratio: kept / pixels };
}

// Decode either a synchronous `data:image/...;base64,...` URL or a remote HTTP(S) image URL.
export async function decodeImageBufferFromOutputUrl(
  outputUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<Buffer> {
  if (outputUrl.startsWith("data:")) {
    const commaIndex = outputUrl.indexOf(",");
    if (commaIndex < 0) {
      throw new Error("無效的圖片資料格式");
    }
    return Buffer.from(outputUrl.slice(commaIndex + 1), "base64");
  }
  const response = await fetchFn(outputUrl);
  if (!response.ok) {
    throw new Error("無法下載字幕圖");
  }
  return Buffer.from(await response.arrayBuffer());
}

// Trim excess top/bottom transparent rows while keeping the full 16:9 width so canvas scaling stays consistent.
export async function cropVerticalTransparentMargin(
  png: Buffer,
  paddingPx = 24,
): Promise<Buffer> {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  if (width === 0 || height === 0) return png;

  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const alpha = data[rowOffset + x * 4 + 3] ?? 0;
      if (alpha > 16) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        break;
      }
    }
  }

  if (maxY < minY) return png;
  const top = Math.max(0, minY - paddingPx);
  const bottom = Math.min(height - 1, maxY + paddingPx);
  const cropHeight = bottom - top + 1;
  if (cropHeight >= height) return png;

  return sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .extract({ left: 0, top, width, height: cropHeight })
    .png()
    .toBuffer();
}

async function resolveStyleLookAndSample(
  project: Project,
  textStyleId: string,
): Promise<{ lookLine: string; sampleUrl?: string }> {
  if (isSubtitleLook(textStyleId)) {
    return { lookLine: subtitleLookLine(textStyleId) };
  }
  if (ObjectId.isValid(textStyleId)) {
    const styles = await textStylesCollection();
    const customDoc = (await styles.findOne({
      _id: new ObjectId(textStyleId),
      clerkUserId: project.clerkUserId,
    })) as TextStyleDoc | null;
    if (customDoc) {
      return {
        lookLine: resolveTextStyleLookLine(customDoc),
        sampleUrl: customDoc.imageUrl || undefined,
      };
    }
  }
  return { lookLine: subtitleLookLine(project.subtitleLook) };
}

// Queue a draw onto one clip video. Safe to call from the generation pipeline (no session cookie).
export async function enqueueProjectOnScreenText(input: {
  project: Project;
  textStyleId: string;
  styleName?: string;
  text: string;
  clipIndex?: number;
  playheadSeconds?: number;
  sectionStart?: number;
  sectionLength?: number;
  baseVideoUrl?: string;
}): Promise<EnqueueOpencutOnScreenTextResult> {
  let spendKey: string | undefined;
  let queuedJobId: ObjectId | undefined;
  const project = input.project;

  try {
    const users = await usersCollection();
    const user = await users.findOne({ clerkUserId: project.clerkUserId });
    if (!user) {
      return { ok: false, error: "找不到使用者" };
    }

    const textStyleId = String(input.textStyleId ?? "").trim();
    const trimmedText = String(input.text ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ON_SCREEN_TEXT_CHARS);

    if (!trimmedText) {
      return { ok: false, error: "請輸入要產生的畫面文字" };
    }

    if (!isSubtitleLook(textStyleId) && ObjectId.isValid(textStyleId)) {
      const styles = await textStylesCollection();
      const customDoc = await styles.findOne({
        _id: new ObjectId(textStyleId),
        clerkUserId: project.clerkUserId,
      });
      if (!customDoc) {
        return { ok: false, error: "找不到文字樣式" };
      }
    }

    await assertCanSpendCredits(user, FRAME_COST);
    spendKey = await consumeCredits(project.clerkUserId, FRAME_COST);

    const projects = await videosCollection();
    const resolvedStyleId = textStyleId || project.subtitleLook || "handwritten";
    const resolvedClipIndex =
      typeof input.clipIndex === "number" && Number.isFinite(input.clipIndex) && input.clipIndex >= 0
        ? Math.floor(input.clipIndex)
        : 0;
    const item: OnscreenTextItem = {
      id: new ObjectId().toHexString(),
      text: trimmedText,
      textStyleId: resolvedStyleId,
      ...(input.styleName?.trim() ? { styleName: input.styleName.trim() } : {}),
      clipIndex: resolvedClipIndex,
      ...(typeof input.playheadSeconds === "number" && Number.isFinite(input.playheadSeconds)
        ? { playheadSeconds: Math.max(0, input.playheadSeconds) }
        : {}),
      ...(typeof input.sectionStart === "number" && Number.isFinite(input.sectionStart)
        ? { sectionStart: Math.max(0, input.sectionStart) }
        : {}),
      ...(typeof input.sectionLength === "number" && Number.isFinite(input.sectionLength)
        ? { sectionLength: Math.max(0.1, input.sectionLength) }
        : {}),
      ...(input.baseVideoUrl?.trim() ? { baseVideoUrl: input.baseVideoUrl.trim() } : {}),
      status: "queued",
      submittedAt: new Date().toISOString(),
      creditsCharged: FRAME_COST,
    };

    const sceneTextLanguage = inferOnScreenTextSceneLanguage(trimmedText);
    const model = imageRouteForSceneText(sceneTextLanguage).model;

    queuedJobId = await insertPendingJob({
      projectId: project._id,
      clipIndex: resolvedClipIndex,
      kind: "onscreenText",
      onscreenTextId: item.id,
      model,
    });

    await projects.updateOne(
      { _id: project._id },
      {
        $push: { onscreenTexts: item },
        $set: { updatedAt: new Date() },
      },
    );

    kickJob(queuedJobId);

    const updated = await projects.findOne({ _id: project._id });
    return {
      ok: true,
      item,
      project: toPublicVideo(updated ?? { ...project, onscreenTexts: [...(project.onscreenTexts ?? []), item] }),
    };
  } catch (error) {
    if (queuedJobId) {
      const jobs = await generationJobsCollection();
      await jobs.deleteOne({ _id: queuedJobId }).catch(() => {});
    }
    if (spendKey) {
      await refundCredits(project.clerkUserId, FRAME_COST, spendKey).catch(() => {});
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "排程畫面文字失敗",
    };
  }
}

// Replay a sticker-only draw so the same line is painted into the clip video, without charging again.
export async function requeueOnScreenTextDraw(
  project: Project,
  item: OnscreenTextItem,
  timing?: { sectionStart?: number; sectionLength?: number; baseVideoUrl?: string },
): Promise<boolean> {
  const projects = await videosCollection();
  const claimed = await projects.updateOne(
    {
      _id: project._id,
      onscreenTexts: {
        $elemMatch: {
          id: item.id,
          status: { $in: ["completed", "failed"] },
          inpaintedVideoUrl: { $exists: false },
        },
      },
    },
    {
      $set: {
        "onscreenTexts.$.status": "queued",
        "onscreenTexts.$.submittedAt": new Date().toISOString(),
        "onscreenTexts.$.creditsCharged": 0,
        ...(typeof timing?.sectionStart === "number" ? { "onscreenTexts.$.sectionStart": timing.sectionStart } : {}),
        ...(typeof timing?.sectionLength === "number"
          ? { "onscreenTexts.$.sectionLength": timing.sectionLength }
          : {}),
        ...(timing?.baseVideoUrl ? { "onscreenTexts.$.baseVideoUrl": timing.baseVideoUrl } : {}),
        updatedAt: new Date(),
      },
      $unset: {
        "onscreenTexts.$.error": "",
        "onscreenTexts.$.blobUrl": "",
        "onscreenTexts.$.outputUrl": "",
        "onscreenTexts.$.sourceVideoUrl": "",
      },
    },
  );
  if (claimed.modifiedCount !== 1) return false;

  const model = imageRouteForSceneText(inferOnScreenTextSceneLanguage(item.text)).model;
  const jobId = await insertPendingJob({
    projectId: project._id,
    clipIndex: item.clipIndex ?? 0,
    kind: "onscreenText",
    onscreenTextId: item.id,
    model,
  });
  kickJob(jobId);
  return true;
}

// Queue a new on-screen text draw from an editor request.
export async function enqueueOpencutOnScreenText(input: {
  videoId: string;
  textStyleId: string;
  styleName?: string;
  text: string;
  clipIndex?: number;
  playheadSeconds?: number;
}): Promise<EnqueueOpencutOnScreenTextResult> {
  try {
    const user = await requireAppUser();
    const videoId = String(input.videoId ?? "").trim();
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }
    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project) {
      return { ok: false, error: "專案不存在" };
    }
    return enqueueProjectOnScreenText({
      project,
      textStyleId: input.textStyleId,
      styleName: input.styleName,
      text: input.text,
      clipIndex: input.clipIndex,
      playheadSeconds: input.playheadSeconds,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "排程畫面文字失敗",
    };
  }
}

// Background sender called by `sendJob` for `kind === "onscreenText"`.
export async function sendOnscreenText(
  project: Project,
  job: GenerationJob,
): Promise<Sent> {
  const item = project.onscreenTexts?.find((entry) => entry.id === job.onscreenTextId);
  if (!item) {
    throw new PermanentJobError("找不到畫面文字項目");
  }
  const line = item.text.trim();
  if (!line) {
    throw new PermanentJobError("畫面文字內容為空");
  }

  const projects = await videosCollection();
  await projects
    .updateOne(
      { _id: project._id, "onscreenTexts.id": item.id },
      { $set: { "onscreenTexts.$.status": "in_progress", updatedAt: new Date() } },
    )
    .catch(() => {});

  const { lookLine, sampleUrl } = await resolveStyleLookAndSample(
    project,
    item.textStyleId,
  );
  const sceneTextLanguage = inferOnScreenTextSceneLanguage(line);
  const targetClipIdx = item.clipIndex ?? job.clipIndex ?? 0;
  const targetClip = project.clips?.[targetClipIdx];
  const targetClipNumber = targetClip?.clipNumber ?? targetClipIdx + 1;
  const targetFrame =
    project.frames?.find(
      (f) => f.clipNumber === targetClipNumber && f.position === "start",
    ) ?? project.frames?.find((f) => f.position === "start");
  const startFrameUrl = targetFrame?.blobUrl || targetFrame?.outputUrl;
  const clipVideoUrl = (targetClip?.blobUrl || targetClip?.outputUrl || "").trim();

  if (!startFrameUrl) {
    throw new PermanentJobError("找不到分鏡靜態圖，無法選擇畫面文字位置");
  }
  if (!clipVideoUrl.startsWith("https://")) {
    throw new Error("分鏡影片尚未完成，稍後再把文字畫進影片");
  }
  if (!hasComfyEndpoint()) {
    throw new PermanentJobError("未設定 ComfyUI，無法把畫面文字畫進影片");
  }

  // Same idea as Swap object-add: pick the open region, paint the letters there, then draw only that box into the video.
  const clipDuration = Math.max(0.5, targetClip?.durationSeconds ?? 6);
  const sectionStart = Math.max(0, item.sectionStart ?? 0);
  const sectionLength = Math.min(6, Math.max(0.5, item.sectionLength ?? clipDuration));
  const clipVideoBuf = await decodeImageBufferFromOutputUrl(clipVideoUrl);
  let guideBuf: Buffer;
  let guideUrl = startFrameUrl;
  if (sectionStart >= 0.15) {
    // Later sentences paint onto the frame at that moment, not the opening still.
    try {
      guideBuf = await extractVideoFrameJpeg(clipVideoBuf, sectionStart);
      guideUrl = await persistBuffer(
        guideBuf,
        `explainer/${project._id.toHexString()}/on-screen-text/${item.id}-guide.jpg`,
        "image/jpeg",
      );
    } catch (error) {
      console.error("[on-screen-text] frame extract failed", { itemId: item.id, error });
      guideBuf = await decodeImageBufferFromOutputUrl(startFrameUrl);
    }
  } else {
    guideBuf = await decodeImageBufferFromOutputUrl(startFrameUrl);
  }
  const safeZone = await detectCenteredFaceSafeTextZone(guideBuf);
  const prompt = inSceneOnScreenTextPrompt({
    text: line,
    lookLine,
    sampleImageIndex: sampleUrl ? 2 : undefined,
    box: safeZone.bestBox,
    width: safeZone.width,
    height: safeZone.height,
  });

  const submitted = await submitImage({
    model: imageModelForSubmit(resolveImageRoute(sceneTextLanguage), true),
    prompt,
    aspectRatio: project.aspectRatio || "16:9",
    quality: "medium",
    resolution: "2k",
    sceneTextLanguage,
    referenceImageUrls: [guideUrl, ...(sampleUrl ? [sampleUrl] : [])],
  });

  const syncImgUrl = submitted.images?.[0]?.url;
  if (!syncImgUrl) {
    throw new Error("畫面文字參考圖尚未完成");
  }

  const paintedBuf = await decodeImageBufferFromOutputUrl(syncImgUrl);
  const actualBox = await computePaintedDiffBoundingBox({
    originalFrame: guideBuf,
    paintedFrame: paintedBuf,
    fallbackBox: safeZone.bestBox,
  });
  const paintedJpgBuf = await sharp(paintedBuf).jpeg({ quality: 94 }).toBuffer();
  const zoneW = Math.max(1, safeZone.width);
  const zoneH = Math.max(1, safeZone.height);
  const comfySub = await submitComfyMaskedTextInpaintVideo({
    videoBuffer: clipVideoBuf,
    paintedStartFrameBuffer: paintedJpgBuf,
    section: {
      start: sectionStart,
      length: sectionLength,
    },
    boxNormalized: {
      x: Math.min(1, Math.max(0, actualBox.x / zoneW)),
      y: Math.min(1, Math.max(0, actualBox.y / zoneH)),
      width: Math.min(1, Math.max(0.02, actualBox.w / zoneW)),
      height: Math.min(1, Math.max(0.02, actualBox.h / zoneH)),
    },
    text: line,
    styleDescription: lookLine,
  });

  const claim: Record<string, unknown> = {
    "onscreenTexts.$.offsetX": safeZone.normalizedOffset.offsetX,
    "onscreenTexts.$.offsetY": safeZone.normalizedOffset.offsetY,
    "onscreenTexts.$.sectionStart": sectionStart,
    "onscreenTexts.$.sectionLength": sectionLength,
    "onscreenTexts.$.sourceVideoUrl": clipVideoUrl,
    updatedAt: new Date(),
  };
  if (project.clips?.[targetClipIdx]) {
    claim[`clips.${targetClipIdx}.status`] = "in_progress";
    claim[`clips.${targetClipIdx}.submittedAt`] = new Date().toISOString();
  }
  await projects
    .updateOne(
      { _id: project._id, "onscreenTexts.id": item.id },
      {
        $set: claim,
        $unset: {
          "onscreenTexts.$.blobUrl": "",
          "onscreenTexts.$.outputUrl": "",
        },
      },
    )
    .catch(() => {});

  return {
    model: "comfy/h3-masked-text-inpaint",
    requestId: comfySub.request_id,
    statusUrl: comfySub.status_url,
  };
}

async function failOnscreenText(
  projectId: ObjectId,
  onscreenTextId: string,
  error: string,
) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  const item = project.onscreenTexts?.find((entry) => entry.id === onscreenTextId);
  const claimed = await projects.updateOne(
    {
      _id: projectId,
      onscreenTexts: {
        $elemMatch: { id: onscreenTextId, status: { $in: ["queued", "in_progress"] } },
      },
    },
    {
      $set: {
        "onscreenTexts.$.status": "failed",
        "onscreenTexts.$.error": error,
        updatedAt: new Date(),
      },
    },
  );
  if (claimed.matchedCount === 0) return;
  const clipIdx = item?.clipIndex ?? 0;
  const clip = project.clips?.[clipIdx];
  const clipUrl = (clip?.blobUrl || clip?.outputUrl || "").trim();
  if (clip?.status === "in_progress" && clipUrl.startsWith("https://")) {
    await projects.updateOne(
      { _id: projectId },
      { $set: { [`clips.${clipIdx}.status`]: "completed", updatedAt: new Date() } },
    );
  }
  const refund = item?.creditsCharged ?? FRAME_COST;
  if (refund > 0) {
    await refundCredits(project.clerkUserId, refund);
  }
}

// Mirror an `onscreenText` background job onto `project.onscreenTexts`.
export async function syncOnscreenTextJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
  errorMessage?: string,
): Promise<void> {
  if (!job.projectId || !job.onscreenTextId) return;
  const projectId = job.projectId;
  const onscreenTextId = job.onscreenTextId;

  if (status === "failed" || status === "nsfw") {
    const fallback = status === "nsfw" ? "畫面文字圖未通過內容檢查" : "畫面文字圖產生失敗";
    await failOnscreenText(projectId, onscreenTextId, errorMessage?.trim() || fallback);
    return;
  }

  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  const item = project?.onscreenTexts?.find((entry) => entry.id === onscreenTextId);
  if (!project || !item) return;

  if (status !== "completed" || !outputUrl) {
    if (status === "in_progress" && item.status === "queued") {
      await projects.updateOne(
        {
          _id: projectId,
          onscreenTexts: { $elemMatch: { id: onscreenTextId, status: "queued" } },
        },
        { $set: { "onscreenTexts.$.status": "in_progress", updatedAt: new Date() } },
      );
    }
    return;
  }

  if (item.status === "completed" || item.status === "failed") return;

  const targetClipIdx = item.clipIndex ?? job.clipIndex ?? 0;

  // Scheme B settle: When the job was submitted to Vast.ai ComfyUI (`MiniMax-H3` Masked Latent Video Inpainting),
  // download the inpainted MP4, persist it to Vercel Blob, and update both `onscreenTexts.$` and the target clip's video!
  if (job.statusUrl && isComfyPromptStatusUrl(job.statusUrl)) {
    try {
      const headers = comfyViewAuthHeaders(outputUrl);
      const vidResp = await fetch(outputUrl, headers ? { headers } : undefined);
      if (!vidResp.ok) {
        throw new Error(`無法下載 H3 Masked Latent 影片（HTTP ${vidResp.status}）`);
      }
      const sectionBuf = Buffer.from(await vidResp.arrayBuffer());
      const sectionStart = item.sectionStart ?? 0;
      const sourceUrl = (item.sourceVideoUrl || "").trim();
      let finalBuf: Buffer = sectionBuf;
      if (sourceUrl.startsWith("https://")) {
        // Comfy returns only the painted time range. Put it back into the full clip and keep the original voice.
        const sourceBuf = await decodeImageBufferFromOutputUrl(sourceUrl);
        finalBuf = Buffer.from(
          await spliceVideoSection({
            source: sourceBuf,
            section: sectionBuf,
            start: sectionStart,
            length: item.sectionLength && item.sectionLength > 0 ? item.sectionLength : 30,
          }),
        );
      } else if (sectionStart > 0.04) {
        throw new Error("找不到原片，無法嵌入這句字幕");
      }
      const inpaintedVideoUrl = await persistBuffer(
        finalBuf,
        `explainer/${projectId.toHexString()}/on-screen-text/${job._id.toHexString()}-inpainted.mp4`,
        "video/mp4",
      );

      const updateSet: Record<string, unknown> = {
        "onscreenTexts.$.status": "completed",
        "onscreenTexts.$.inpaintedVideoUrl": inpaintedVideoUrl,
        updatedAt: new Date(),
      };
      if (project.clips && project.clips[targetClipIdx]) {
        updateSet[`clips.${targetClipIdx}.status`] = "completed";
        updateSet[`clips.${targetClipIdx}.outputUrl`] = inpaintedVideoUrl;
        updateSet[`clips.${targetClipIdx}.blobUrl`] = inpaintedVideoUrl;
      }

      const claimed = await projects.updateOne(
        {
          _id: projectId,
          onscreenTexts: {
            $elemMatch: { id: onscreenTextId, status: { $in: ["queued", "in_progress"] } },
          },
        },
        {
          $set: updateSet,
          $unset: {
            "onscreenTexts.$.error": "",
            "onscreenTexts.$.blobUrl": "",
            "onscreenTexts.$.outputUrl": "",
          },
        },
      );
      if (claimed.modifiedCount === 1) {
        const { triggerExplainerAutoOnScreenText } = await import("@/service/director/auto-onscreen-text");
        await triggerExplainerAutoOnScreenText(projectId).catch((err) => {
          console.error("[auto-onscreen-text] next sentence failed", { projectId, err });
        });
      }
      return;
    } catch (error) {
      console.error("[on-screen-text] H3 Masked Latent video settle failed", {
        jobId: job._id,
        error,
      });
      await failOnscreenText(projectId, onscreenTextId, "H3 Masked Latent 畫面文字影片合成失敗");
      return;
    }
  }

  // If `sendOnscreenText` already extracted and saved the feathered in-scene patch (`item.blobUrl`), mark completed directly!
  if (item.blobUrl && item.blobUrl.startsWith("https://")) {
    await projects.updateOne(
      {
        _id: projectId,
        onscreenTexts: {
          $elemMatch: { id: onscreenTextId, status: { $in: ["queued", "in_progress"] } },
        },
      },
      {
        $set: {
          "onscreenTexts.$.status": "completed",
          updatedAt: new Date(),
        },
        $unset: { "onscreenTexts.$.error": "" },
      },
    );
    return;
  }

  let croppedPng: Buffer;
  try {
    const { lookLine } = await resolveStyleLookAndSample(project, item.textStyleId);
    const keyColor = chooseOnScreenTextKeyColor({
      textStyleId: item.textStyleId,
      lookLine,
    });
    const rawBuffer = await decodeImageBufferFromOutputUrl(outputUrl);
    const keyed = await keyColorDifferencePng(rawBuffer, keyColor);
    if (plateIsEmpty(keyed.ratio)) {
      await failOnscreenText(projectId, onscreenTextId, PLATE_EMPTY_ERROR);
      return;
    }
    croppedPng = await cropVerticalTransparentMargin(keyed.png);
  } catch (error) {
    console.error("[on-screen-text] key failed", { jobId: job._id, error });
    await failOnscreenText(projectId, onscreenTextId, "畫面文字圖去背處理失敗");
    return;
  }

  const blobUrl = await persistBuffer(
    croppedPng,
    `explainer/${projectId.toHexString()}/on-screen-text/${job._id.toHexString()}.png`,
    "image/png",
  );

  await projects.updateOne(
    {
      _id: projectId,
      onscreenTexts: {
        $elemMatch: { id: onscreenTextId, status: { $in: ["queued", "in_progress"] } },
      },
    },
    {
      $set: {
        "onscreenTexts.$.status": "completed",
        "onscreenTexts.$.outputUrl": blobUrl,
        "onscreenTexts.$.blobUrl": blobUrl,
        updatedAt: new Date(),
      },
      $unset: { "onscreenTexts.$.error": "" },
    },
  );
}

// Synchronous helper retained for direct calls.
export async function generateOpencutOnScreenText(input: {
  videoId: string;
  textStyleId: string;
  text: string;
}): Promise<GenerateOpencutOnScreenTextResult> {
  let spendKey: string | undefined;
  let clerkUserId = "";

  try {
    const user = await requireAppUser();
    clerkUserId = user.clerkUserId;

    const videoId = String(input.videoId ?? "").trim();
    const textStyleId = String(input.textStyleId ?? "").trim();
    const trimmedText = String(input.text ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ON_SCREEN_TEXT_CHARS);

    if (!trimmedText) {
      return { ok: false, error: "請輸入要產生的畫面文字" };
    }
    if (!ObjectId.isValid(videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const projects = await videosCollection();
    const project = await projects.findOne({
      _id: new ObjectId(videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project) {
      return { ok: false, error: "專案不存在" };
    }

    const { lookLine, sampleUrl } = await resolveStyleLookAndSample(project, textStyleId);
    const keyColor = chooseOnScreenTextKeyColor({
      textStyleId: textStyleId || project.subtitleLook,
      lookLine,
    });
    const sceneTextLanguage = inferOnScreenTextSceneLanguage(trimmedText);
    const route = resolveImageRoute(sceneTextLanguage);
    const model = imageModelForSubmit(route, Boolean(sampleUrl));
    const prompt = onScreenTextPrompt({
      text: trimmedText,
      lookLine,
      sampleImageIndex: sampleUrl ? 1 : undefined,
      keyColor,
    });

    await assertCanSpendCredits(user, FRAME_COST);
    spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);

    const submitted = toSent(
      model,
      await submitImage(
        {
          model,
          prompt,
          aspectRatio: "16:9",
          quality: "medium",
          resolution: "1k",
          sceneTextLanguage,
          referenceImageUrls: sampleUrl ? [sampleUrl] : undefined,
        },
        { webhook: false },
      ),
    );

    const outputUrl = submitted.images?.[0]?.url;
    if (!outputUrl) {
      throw new Error(submitted.error || "產生字幕圖失敗");
    }

    const rawBuffer = await decodeImageBufferFromOutputUrl(outputUrl);
    const keyed = await keyColorDifferencePng(rawBuffer, keyColor);
    if (plateIsEmpty(keyed.ratio)) {
      throw new Error(PLATE_EMPTY_ERROR);
    }

    const croppedPng = await cropVerticalTransparentMargin(keyed.png);
    const itemId = new ObjectId().toHexString();
    const blobUrl = await persistBuffer(
      croppedPng,
      `explainer/${videoId}/on-screen-text/${itemId}.png`,
      "image/png",
    );

    return {
      ok: true,
      url: blobUrl,
      text: trimmedText,
      textStyleId: textStyleId || project.subtitleLook || "handwritten",
    };
  } catch (error) {
    if (spendKey && clerkUserId) {
      await refundCredits(clerkUserId, FRAME_COST, spendKey).catch(() => {});
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生畫面文字失敗",
    };
  }
}
