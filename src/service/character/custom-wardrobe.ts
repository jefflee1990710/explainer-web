import { generateImage, generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { customWardrobeItemsCollection } from "@/dao/custom-wardrobe-items";
import {
  CUSTOM_WARDROBE_NAME_MAX,
  CUSTOM_WARDROBE_PROMPT_MAX,
  customWardrobeOptionId,
  parseCustomWardrobeHexId,
  toPublicCustomWardrobeItem,
  type CustomWardrobeItem,
  type PublicCustomWardrobeItem,
} from "@/model/custom-wardrobe-item";
import { requireAppUser } from "@/service/auth";
import {
  CHARACTER_WARDROBE_PARTS,
  type CharacterLookCategory,
  type CharacterWardrobePart,
} from "@/service/character/character-look";
import { directorModel } from "@/service/director/model";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  hasOpenRouterKey,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

const GEMINI_STUDIO_PREVIEW_MODEL =
  process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";

const analyzeSchema = z.object({
  part: z.enum(["hair", "top", "pants", "shoes", "accessory"]),
  category: z.enum(["classic", "stylized", "extreme"]),
  nameEn: z
    .string()
    .describe("Short 2-4 word English display name, Title Case, e.g. 'Cropped Tweed Jacket'"),
  nameZh: z
    .string()
    .describe("Traditional Chinese (繁體中文) display name, 4-9 characters, e.g. '法式粗花呢短版外套'"),
  prompt: z
    .string()
    .describe(
      "Detailed 1-sentence English studio description of ONLY this garment, hairstyle, or accessory (fabric, cut, color, silhouette, collar/details), with no person identity or background.",
    ),
});

export type AnalyzeCustomWardrobeResult =
  | {
      ok: true;
      part: CharacterWardrobePart;
      category: Exclude<CharacterLookCategory, "all">;
      nameEn: string;
      nameZh: string;
      prompt: string;
      referenceImageUrl: string;
    }
  | { ok: false; error: string };

export type CreateCustomWardrobeResult =
  | { ok: true; item: PublicCustomWardrobeItem }
  | { ok: false; error: string };

export function buildCustomLookStudioPrompt(
  part: CharacterWardrobePart,
  promptText: string,
): string {
  const clean = promptText.replace(/\s*Isolated wardrobe piece [\w-]+\.?/g, "").trim();
  const baseFrame = [
    "Photorealistic studio photograph, 1:1.",
    "Plain light grey seamless background.",
    "Centered subject, sharp focus, natural fabric/hair texture.",
    "Real photograph. Not an illustration, not a cartoon, not 3D.",
    "No text, no letters, no numbers, no watermark, no border.",
  ].join(" ");

  switch (part) {
    case "hair":
      return `${baseFrame} Subject: one person facing the camera, light warm skin, neutral expression, no glasses. Show the entire hairstyle clearly: ${clean}. Include only as much of the shoulders as needed to show the hair.`;
    case "top":
      return `${baseFrame} Subject: only the upper-body top garment on an invisible mannequin, front view. The garment is: ${clean}. No head, no pants, no shoes. Centered and filling the frame with crisp fabric drape and tailoring detail.`;
    case "pants":
      return `${baseFrame} Subject: only the pants or skirt, front view, as if worn by an invisible figure, from waist to hem. No shirt, no shoes, no head, no hands. The garment is: ${clean}. Centered and large.`;
    case "shoes":
      return `${baseFrame} Subject: one pair of shoes, three-quarter view, both shoes visible, resting on the ground. No legs above the ankle, no person. The shoes are: ${clean}. Centered and large.`;
    case "accessory":
      return `${baseFrame} Subject: one head-and-shoulders or torso mannequin wearing or holding the fashion accessory, front view. The fashion accessory is: ${clean}. Make the accessory clean, stylish, and unmistakable.`;
  }
}

// Tint plain studio grey backgrounds into the Scro brand gradient (Electric Lime #c6f24b ->
// Warm Cream #fff6eb -> Coral #ff4d2e) so custom wardrobe cards match built-in look cards.
export async function tintStudioPreviewBrandGradient(inputBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(inputBuffer)
    .resize(1024, 1024, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const cornerIdx = [
    0,
    (width - 1) * channels,
    (height - 1) * width * channels,
    ((height - 1) * width + (width - 1)) * channels,
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const idx of cornerIdx) {
    bgR += data[idx]!;
    bgG += data[idx + 1]!;
    bgB += data[idx + 2]!;
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;

  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    const ny = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1);
      const offset = (y * width + x) * channels;
      const r = data[offset]!;
      const g = data[offset + 1]!;
      const b = data[offset + 2]!;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC - minC;
      const distBg = Math.hypot(r - bgR, g - bgG, b - bgB);
      const edgeDist = Math.min(nx, 1 - nx, ny, 1 - ny);
      const isNeutralSeamless = sat < 26 && r > 135 && g > 135 && b > 135;
      const bgWeight = isNeutralSeamless
        ? Math.max(
            0,
            Math.min(1, (1 - sat / 26) * (distBg < 85 ? 1 : Math.max(0, 1 - (distBg - 85) / 60))),
          )
        : edgeDist < 0.06 && distBg < 45
          ? 0.7
          : 0;

      if (bgWeight > 0.01) {
        const t = nx * 0.55 + ny * 0.45;
        let gradR: number;
        let gradG: number;
        let gradB: number;
        if (t < 0.5) {
          const u = t * 2;
          gradR = 198 * (1 - u) + 255 * u;
          gradG = 242 * (1 - u) + 246 * u;
          gradB = 75 * (1 - u) + 235 * u;
        } else {
          const u = (t - 0.5) * 2;
          gradR = 255 * (1 - u) + 255 * u;
          gradG = 246 * (1 - u) + 77 * u;
          gradB = 235 * (1 - u) + 46 * u;
        }
        const shade = Math.min(1.08, Math.max(0.78, (r + g + b) / (bgR + bgG + bgB || 660)));
        const targetR = Math.min(255, Math.round(gradR * shade));
        const targetG = Math.min(255, Math.round(gradG * shade));
        const targetB = Math.min(255, Math.round(gradB * shade));
        const mix = bgWeight * 0.88;
        out[offset] = Math.round(r * (1 - mix) + targetR * mix);
        out[offset + 1] = Math.round(g * (1 - mix) + targetG * mix);
        out[offset + 2] = Math.round(b * (1 - mix) + targetB * mix);
      } else {
        const avg = (r + g + b) / 3;
        out[offset] = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.16)));
        out[offset + 1] = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.16)));
        out[offset + 2] = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.16)));
      }
    }
  }

  return sharp(out, { raw: { width, height, channels } })
    .webp({ quality: 84 })
    .toBuffer();
}

export async function generateCustomLookStudioBuffer(input: {
  part: CharacterWardrobePart;
  cleanPrompt: string;
  referenceImageUrl?: string;
}): Promise<Buffer> {
  const studioPrompt = buildCustomLookStudioPrompt(input.part, input.cleanPrompt);
  let rawBuf: Buffer | null = null;

  // 1. Primary: OpenRouter Seedream 5.0 Pro with reference image so fabric/pattern stays faithful
  // while isolated onto a 1:1 studio mannequin/stand.
  if (hasOpenRouterKey()) {
    try {
      const result = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt: studioPrompt,
        aspectRatio: "1:1",
        resolution: "1k",
        ...(input.referenceImageUrl ? { referenceImageUrls: [input.referenceImageUrl] } : {}),
      });
      const imageUrl = result.images?.[0]?.url;
      if (imageUrl) {
        rawBuf = imageUrl.startsWith("data:")
          ? Buffer.from(imageUrl.split(",")[1] || "", "base64")
          : Buffer.from(await (await fetch(imageUrl)).arrayBuffer());
      }
    } catch (openRouterErr) {
      console.warn("[custom-wardrobe] OpenRouter studio preview failed, trying Gemini:", openRouterErr);
    }
  }

  // 2. Fallback: Google Gemini 2.5 Flash Image (same model used for built-in character-looks)
  if (!rawBuf) {
    const googleApiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      const { image } = await generateImage({
        model: createGoogleGenerativeAI({ apiKey: googleApiKey }).image(
          GEMINI_STUDIO_PREVIEW_MODEL,
        ),
        prompt: studioPrompt,
        aspectRatio: "1:1",
      });
      rawBuf = Buffer.from(image.uint8Array);
    }
  }

  if (!rawBuf) {
    throw new Error("無法產生 AI 棚拍單品預覽圖（請確認 OPENROUTER_API_KEY 或 GOOGLE_GENERATIVE_AI_API_KEY）");
  }

  return tintStudioPreviewBrandGradient(rawBuf);
}

/** Upload an image and use Gemini 3.8 Flash Vision to extract cloth, hairstyle, or accessory metadata. */
export async function analyzeCustomWardrobeImageAction(
  formData: FormData,
): Promise<AnalyzeCustomWardrobeResult> {
  try {
    const user = await requireAppUser();
    const file = formData.get("file");
    const preferredPartRaw = String(formData.get("part") || "").trim();
    const preferredPart = CHARACTER_WARDROBE_PARTS.includes(
      preferredPartRaw as CharacterWardrobePart,
    )
      ? (preferredPartRaw as CharacterWardrobePart)
      : undefined;

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "請選擇一張圖片" };
    }
    if (file.size > 12 * 1024 * 1024) {
      return { ok: false, error: "圖片大小不可超過 12MB" };
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const [visionBuffer, uploadWebp] = await Promise.all([
      sharp(rawBuffer).resize(640, 640, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer(),
      sharp(rawBuffer).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    ]);

    const referenceImageUrl = await persistBuffer(
      uploadWebp,
      `explainer/custom-wardrobe/${user._id.toHexString()}/ref-${Date.now()}.webp`,
      "image/webp",
    );

    const partInstruction = preferredPart
      ? `Focus specifically on extracting the "${preferredPart}" (hair=hairstyle, top=upper garment/jacket/dress, pants=trousers/jeans/skirt/shorts, shoes=footwear, accessory=glasses/bag/hat/jewelry/scarf/mic) from the image.`
      : "Identify whether the primary fashion item in this photo is a hairstyle ('hair'), upper garment/dress ('top'), lower garment ('pants'), footwear ('shoes'), or fashion accessory ('accessory'), and extract that item.";

    const { output } = await generateText({
      model: directorModel(),
      output: Output.object({ schema: analyzeSchema }),
      system: [
        "You are an expert fashion & personal styling archivist.",
        partInstruction,
        "Describe ONLY the isolated garment, hairstyle, or accessory in rich, concrete sartorial English (fabric, color, cut, collar, silhouette) so a studio image model can recreate it accurately.",
        "Provide a concise English Title Case name (nameEn) and a natural Traditional Chinese name (nameZh).",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [{ type: "file", data: visionBuffer, mediaType: "image/jpeg" }],
        },
      ],
    });

    const parsed = analyzeSchema.parse(output);
    return {
      ok: true,
      part: preferredPart ?? parsed.part,
      category: parsed.category,
      nameEn: parsed.nameEn.trim().slice(0, CUSTOM_WARDROBE_NAME_MAX),
      nameZh: parsed.nameZh.trim().slice(0, CUSTOM_WARDROBE_NAME_MAX),
      prompt: parsed.prompt.trim().slice(0, CUSTOM_WARDROBE_PROMPT_MAX),
      referenceImageUrl,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "分析圖片失敗",
    };
  }
}

/** Save a customized cloth, hairstyle, or accessory item and generate its 1:1 studio WebP preview. */
export async function createCustomWardrobeItemAction(input: {
  part: CharacterWardrobePart;
  category?: Exclude<CharacterLookCategory, "all">;
  name: string;
  nameZh?: string;
  prompt: string;
  referenceImageUrl: string;
  generateStudioPreview?: boolean;
}): Promise<CreateCustomWardrobeResult> {
  try {
    const user = await requireAppUser();
    if (!CHARACTER_WARDROBE_PARTS.includes(input.part)) {
      return { ok: false, error: "請選擇部位類別（髮型／上衣／褲裙／鞋款／配飾）" };
    }
    const name = input.name.trim().slice(0, CUSTOM_WARDROBE_NAME_MAX);
    const nameZh = (input.nameZh || name).trim().slice(0, CUSTOM_WARDROBE_NAME_MAX);
    const rawPrompt = input.prompt.trim().slice(0, CUSTOM_WARDROBE_PROMPT_MAX);
    const refUrl = input.referenceImageUrl.trim();
    if (!name) return { ok: false, error: "請輸入單品名稱" };
    if (!rawPrompt) return { ok: false, error: "請輸入單品造型描述" };
    if (!refUrl.startsWith("https://")) return { ok: false, error: "請先上傳參考圖片" };

    const itemId = new ObjectId();
    const optionId = customWardrobeOptionId(itemId.toHexString());
    const cleanPrompt = rawPrompt.replace(/\s*Isolated wardrobe piece [\w-]+\.?/g, "").trim();
    const storedPrompt = `${cleanPrompt.replace(/\.$/, "")}. Isolated wardrobe piece ${optionId}.`;

    let previewImageUrl = refUrl;
    if (input.generateStudioPreview !== false) {
      try {
        const webpBuffer = await generateCustomLookStudioBuffer({
          part: input.part,
          cleanPrompt,
          referenceImageUrl: refUrl,
        });
        previewImageUrl = await persistBuffer(
          webpBuffer,
          `explainer/custom-wardrobe/${user._id.toHexString()}/${optionId}.webp`,
          "image/webp",
        );
      } catch (previewError) {
        console.warn("[custom-wardrobe] studio preview fallback to uploaded image:", previewError);
      }
    }

    const now = new Date();
    const doc: CustomWardrobeItem & { _id: ObjectId } = {
      _id: itemId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      part: input.part,
      category: input.category ?? "stylized",
      name,
      nameZh,
      prompt: storedPrompt,
      referenceImageUrl: refUrl,
      previewImageUrl,
      createdAt: now,
      updatedAt: now,
    };

    const col = await customWardrobeItemsCollection();
    await col.insertOne(doc);

    revalidatePath("/app/wardrobe");
    revalidatePath("/app/room");
    revalidatePath("/app/life");
    revalidatePath("/app/characters/generate");

    return { ok: true, item: toPublicCustomWardrobeItem(doc) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "建立自訂造型單品失敗",
    };
  }
}

export async function listCustomWardrobeItems(
  clerkUserId: string,
): Promise<PublicCustomWardrobeItem[]> {
  const col = await customWardrobeItemsCollection();
  const docs = (await col
    .find({ clerkUserId })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()) as Array<CustomWardrobeItem & { _id: ObjectId }>;
  return docs.map(toPublicCustomWardrobeItem);
}

export async function listCustomWardrobeItemsAction(): Promise<{
  ok: boolean;
  items: PublicCustomWardrobeItem[];
}> {
  try {
    const user = await requireAppUser();
    const items = await listCustomWardrobeItems(user.clerkUserId);
    return { ok: true, items };
  } catch {
    return { ok: false, items: [] };
  }
}

export async function deleteCustomWardrobeItemAction(
  idOrOptionId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireAppUser();
    const hexId = parseCustomWardrobeHexId(idOrOptionId) ?? idOrOptionId;
    if (!ObjectId.isValid(hexId)) {
      return { ok: false, error: "找不到自訂造型單品" };
    }
    const col = await customWardrobeItemsCollection();
    const res = await col.deleteOne({
      _id: new ObjectId(hexId),
      clerkUserId: user.clerkUserId,
    });
    if (res.deletedCount !== 1) {
      return { ok: false, error: "找不到自訂造型單品" };
    }
    revalidatePath("/app/wardrobe");
    revalidatePath("/app/room");
    revalidatePath("/app/life");
    revalidatePath("/app/characters/generate");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除失敗",
    };
  }
}

/** Regenerate an AI 1:1 studio preview for an existing custom wardrobe item. */
export async function regenerateCustomWardrobePreviewAction(
  idOrOptionId: string,
): Promise<CreateCustomWardrobeResult> {
  try {
    const user = await requireAppUser();
    const hexId = parseCustomWardrobeHexId(idOrOptionId) ?? idOrOptionId;
    if (!ObjectId.isValid(hexId)) {
      return { ok: false, error: "找不到自訂造型單品" };
    }
    const col = await customWardrobeItemsCollection();
    const item = await col.findOne({
      _id: new ObjectId(hexId),
      clerkUserId: user.clerkUserId,
    });
    if (!item) {
      return { ok: false, error: "找不到自訂造型單品" };
    }
    const optionId = customWardrobeOptionId(item._id.toHexString());
    const cleanPrompt = item.prompt.replace(/\s*Isolated wardrobe piece [\w-]+\.?/g, "").trim();
    const webpBuffer = await generateCustomLookStudioBuffer({
      part: item.part,
      cleanPrompt,
      referenceImageUrl: item.referenceImageUrl,
    });
    const previewImageUrl = await persistBuffer(
      webpBuffer,
      `explainer/custom-wardrobe/${user._id.toHexString()}/${optionId}-${Date.now()}.webp`,
      "image/webp",
    );
    const now = new Date();
    await col.updateOne(
      { _id: item._id },
      { $set: { previewImageUrl, updatedAt: now } },
    );
    revalidatePath("/app/wardrobe");
    revalidatePath("/app/room");
    revalidatePath("/app/life");
    revalidatePath("/app/characters/generate");
    return {
      ok: true,
      item: toPublicCustomWardrobeItem({
        ...item,
        previewImageUrl,
        updatedAt: now,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "重新生成預覽圖失敗",
    };
  }
}

/** Resolve any `cw_<hexId>` picks in a user's wardrobe selection to their stored prompt texts. */
export async function resolveCustomWardrobePickPrompts(
  clerkUserId: string,
  picks: Partial<Record<CharacterWardrobePart, string>>,
): Promise<Partial<Record<CharacterWardrobePart, string>>> {
  const customHexIds: Array<{ part: CharacterWardrobePart; objectId: ObjectId }> = [];
  for (const part of CHARACTER_WARDROBE_PARTS) {
    const rawId = picks[part];
    if (!rawId) continue;
    const hex = parseCustomWardrobeHexId(rawId);
    if (hex && ObjectId.isValid(hex)) {
      customHexIds.push({ part, objectId: new ObjectId(hex) });
    }
  }
  if (customHexIds.length === 0) return {};

  const col = await customWardrobeItemsCollection();
  const docs = await col
    .find({
      clerkUserId,
      _id: { $in: customHexIds.map((item) => item.objectId) },
    })
    .toArray();
  const byHex = new Map(docs.map((doc) => [doc._id!.toHexString(), doc.prompt]));

  const resolved: Partial<Record<CharacterWardrobePart, string>> = {};
  for (const { part, objectId } of customHexIds) {
    const p = byHex.get(objectId.toHexString());
    if (p) resolved[part] = p;
  }
  return resolved;
}
