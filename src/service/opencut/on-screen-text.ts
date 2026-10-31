import { ObjectId } from "mongodb";
import sharp from "sharp";
import { generationJobsCollection, textStylesCollection, videosCollection } from "@/dao";
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

// Detect CJK characters so Chinese/Japanese/Korean on-screen text routes appropriately.
export function inferOnScreenTextSceneLanguage(text: string): SceneTextLanguage {
  if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text)) {
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

// Queue a new `ScroOnscreenText` item on the project and kick off background generation in `generationJobs`.
export async function enqueueOpencutOnScreenText(input: {
  videoId: string;
  textStyleId: string;
  styleName?: string;
  text: string;
}): Promise<EnqueueOpencutOnScreenTextResult> {
  let spendKey: string | undefined;
  let clerkUserId = "";
  let queuedJobId: ObjectId | undefined;

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

    if (!isSubtitleLook(textStyleId) && ObjectId.isValid(textStyleId)) {
      const styles = await textStylesCollection();
      const customDoc = await styles.findOne({
        _id: new ObjectId(textStyleId),
        clerkUserId: user.clerkUserId,
      });
      if (!customDoc) {
        return { ok: false, error: "找不到文字樣式" };
      }
    }

    await assertCanSpendCredits(user, FRAME_COST);
    spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);

    const resolvedStyleId = textStyleId || project.subtitleLook || "handwritten";
    const item: OnscreenTextItem = {
      id: new ObjectId().toHexString(),
      text: trimmedText,
      textStyleId: resolvedStyleId,
      ...(input.styleName?.trim() ? { styleName: input.styleName.trim() } : {}),
      status: "queued",
      submittedAt: new Date().toISOString(),
      creditsCharged: FRAME_COST,
    };

    const sceneTextLanguage = inferOnScreenTextSceneLanguage(trimmedText);
    const model = imageRouteForSceneText(sceneTextLanguage).model;

    queuedJobId = await insertPendingJob({
      projectId: project._id,
      clipIndex: 0,
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
    if (spendKey && clerkUserId) {
      await refundCredits(clerkUserId, FRAME_COST, spendKey).catch(() => {});
    }
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
  const keyColor = chooseOnScreenTextKeyColor({
    textStyleId: item.textStyleId,
    lookLine,
  });
  const sceneTextLanguage = inferOnScreenTextSceneLanguage(line);
  const route = resolveImageRoute(sceneTextLanguage);
  const model = imageModelForSubmit(route, Boolean(sampleUrl));
  const prompt = onScreenTextPrompt({
    text: line,
    lookLine,
    sampleImageIndex: sampleUrl ? 1 : undefined,
    keyColor,
  });

  const submitted = await submitImage({
    model,
    prompt,
    aspectRatio: "16:9",
    quality: "medium",
    resolution: "1k",
    sceneTextLanguage,
    referenceImageUrls: sampleUrl ? [sampleUrl] : undefined,
  });
  return toSent(model, submitted);
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
  await refundCredits(project.clerkUserId, item?.creditsCharged ?? FRAME_COST);
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
