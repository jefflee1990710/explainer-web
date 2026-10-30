import { ObjectId } from "mongodb";
import sharp from "sharp";
import { textStylesCollection, videosCollection } from "@/dao";
import type { SceneTextLanguage } from "@/model/project";
import type { TextStyleDoc } from "@/model/text-style";
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
} from "@/service/director/subtitle-look";
import {
  PLATE_EMPTY_ERROR,
  plateIsEmpty,
  subtitlePlatePrompt,
} from "@/service/director/subtitle-plate";
import {
  imageModelForSubmit,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import { submitImage } from "@/service/higgsfield/generate";
import { persistBuffer } from "@/service/higgsfield/persist";
import { keyGreenPng } from "@/service/higgsfield/subtitle-plate-job";
import { toSent } from "@/service/generation/sent";
import { resolveTextStyleLookLine } from "@/service/text-style/look-line";

const MAX_ON_SCREEN_TEXT_CHARS = 240;

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

// Detect CJK characters so Chinese/Japanese/Korean on-screen text routes appropriately.
export function inferOnScreenTextSceneLanguage(text: string): SceneTextLanguage {
  if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(text)) {
    return "zh-Hant";
  }
  return "en";
}

// Build the chroma-green AI subtitle graphic prompt preserving the user's exact typed text.
export function onScreenTextPrompt(input: {
  text: string;
  lookLine?: string;
  sampleImageIndex?: number;
}): string {
  return subtitlePlatePrompt({
    line: input.text.trim(),
    lookLine: input.lookLine,
    sampleImageIndex: input.sampleImageIndex,
  });
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

// Generate a chroma-keyed AI subtitle graphic from custom user text and a selected text style.
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

    let lookLine = subtitleLookLine(project.subtitleLook);
    let sampleUrl: string | undefined;

    if (isSubtitleLook(textStyleId)) {
      lookLine = subtitleLookLine(textStyleId);
    } else if (ObjectId.isValid(textStyleId)) {
      const styles = await textStylesCollection();
      const customDoc = (await styles.findOne({
        _id: new ObjectId(textStyleId),
        clerkUserId: user.clerkUserId,
      })) as TextStyleDoc | null;
      if (!customDoc) {
        return { ok: false, error: "找不到文字樣式" };
      }
      lookLine = resolveTextStyleLookLine(customDoc);
      sampleUrl = customDoc.imageUrl || undefined;
    }

    const sceneTextLanguage = inferOnScreenTextSceneLanguage(trimmedText);
    const route = resolveImageRoute(sceneTextLanguage);
    const model = imageModelForSubmit(route, Boolean(sampleUrl));
    const prompt = onScreenTextPrompt({
      text: trimmedText,
      lookLine,
      sampleImageIndex: sampleUrl ? 1 : undefined,
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
    const keyed = await keyGreenPng(rawBuffer);
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
      await refundCredits(clerkUserId, FRAME_COST, spendKey).catch((refundErr) => {
        console.error("[on-screen-text] refund failed", { refundErr });
      });
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "產生畫面文字失敗",
    };
  }
}
