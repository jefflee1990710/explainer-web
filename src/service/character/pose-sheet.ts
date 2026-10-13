import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";
import {
  characterPoseRevisionPrompt,
  characterPoseSheetPrompt,
  type CharacterLookSelection,
} from "@/service/character/character-look";

const MODEL = process.env.CHARACTER_LOOK_PREVIEW_MODEL || "gemini-2.5-flash-image";

function googleImage() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY");
  return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

// One Gemini still: four views plus four different full-body poses.
export async function renderCharacterPoseSheet(selection: CharacterLookSelection) {
  const { image } = await generateImage({
    model: googleImage(),
    prompt: characterPoseSheetPrompt(selection),
    aspectRatio: "1:1",
  });
  const webp = await sharp(Buffer.from(image.uint8Array))
    .resize(1600, 1600, { fit: "cover" })
    .webp({ quality: 84 })
    .toBuffer();
  return `data:image/webp;base64,${webp.toString("base64")}`;
}

const COMMENT_MAX = 400;
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

type SheetAspect = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

const SHEET_SIZE: Record<SheetAspect, { width: number; height: number }> = {
  "1:1": { width: 1600, height: 1600 },
  "16:9": { width: 1600, height: 900 },
  "9:16": { width: 900, height: 1600 },
  "4:3": { width: 1600, height: 1200 },
  "3:4": { width: 1200, height: 1600 },
};

// Keep the user's wording, and reject a blank or oversized note.
export function poseRevisionComment(comment: string) {
  const text = comment.trim();
  if (!text) throw new Error("請寫下要改的地方");
  if (text.length > COMMENT_MAX) throw new Error("修改意見太長");
  return text;
}

// The current sheet, sent back so the next picture is an edit of this one.
export function poseSheetImageBuffer(dataUrl: string) {
  const match = /^data:image\/(?:webp|png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("姿勢圖格式不正確");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > IMAGE_MAX_BYTES) throw new Error("姿勢圖太大");
  return buffer;
}

function sheetAspect(width: number, height: number): SheetAspect {
  const ratio = width / height;
  const options: Array<{ id: SheetAspect; value: number }> = [
    { id: "1:1", value: 1 },
    { id: "4:3", value: 4 / 3 },
    { id: "3:4", value: 3 / 4 },
    { id: "16:9", value: 16 / 9 },
    { id: "9:16", value: 9 / 16 },
  ];
  return options.reduce((best, option) =>
    Math.abs(Math.log(option.value / ratio)) < Math.abs(Math.log(best.value / ratio)) ? option : best,
  ).id;
}

// Revise the attached sheet using the comment. Look stays unless the comment changes it.
export async function reviseCharacterPoseSheet(
  selection: CharacterLookSelection,
  dataUrl: string,
  comment: string,
) {
  const note = poseRevisionComment(comment);
  const source = poseSheetImageBuffer(dataUrl);
  const meta = await sharp(source).metadata();
  const aspectRatio = sheetAspect(meta.width || 1600, meta.height || 1600);
  const size = SHEET_SIZE[aspectRatio];
  const { image } = await generateImage({
    model: googleImage(),
    prompt: {
      images: [dataUrl],
      text: characterPoseRevisionPrompt(selection, note),
    },
    aspectRatio,
  });
  const webp = await sharp(Buffer.from(image.uint8Array))
    .resize(size.width, size.height, { fit: "cover" })
    .webp({ quality: 84 })
    .toBuffer();
  return `data:image/webp;base64,${webp.toString("base64")}`;
}
