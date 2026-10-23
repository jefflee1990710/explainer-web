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

const PREVIEW_IMAGE_MODEL =
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

function googleImageModel() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  return createGoogleGenerativeAI({ apiKey }).image(PREVIEW_IMAGE_MODEL);
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
        const { image } = await generateImage({
          model: googleImageModel(),
          prompt: buildCustomLookStudioPrompt(input.part, cleanPrompt),
          aspectRatio: "1:1",
        });
        const webpBuffer = await sharp(Buffer.from(image.uint8Array))
          .resize(1024, 1024, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();
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
