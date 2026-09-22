import { put } from "@vercel/blob";
import type { ObjectId } from "mongodb";
import sharp from "sharp";
import type { FramePosition } from "@/model/project";

// Decoded sketch layers larger than this are rejected (transparent PNGs of a
// few strokes are normally well under 500KB).
const MAX_SKETCH_BYTES = 6 * 1024 * 1024;

// Parse a `data:image/png;base64,...` URL produced by the sketch canvas.
export function decodeSketchDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("手繪圖層格式不正確");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) throw new Error("手繪圖層是空的");
  if (buffer.length > MAX_SKETCH_BYTES) throw new Error("手繪圖層太大，請減少筆畫");
  return buffer;
}

// Burn the transparent sketch layer onto the current frame image so the
// provider sees one picture: the old frame plus the director's markings.
export async function compositeSketch(baseImage: Buffer, sketch: Buffer) {
  const meta = await sharp(baseImage).metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) throw new Error("無法讀取分鏡圖尺寸");

  // The canvas is sized to the image on the client, but resize defensively
  // so a mismatch never throws inside composite().
  const overlay = await sharp(sketch)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp(baseImage)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

// Fetch the frame, composite the sketch, and store the annotated copy in
// Blob. Returns the public URL to attach as a reference image.
export async function persistFrameAnnotation(input: {
  projectId: ObjectId;
  clipNumber: number;
  position: FramePosition;
  baseImageUrl: string;
  sketchDataUrl: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法保存標註圖");
  }
  const sketch = decodeSketchDataUrl(input.sketchDataUrl);
  const response = await fetch(input.baseImageUrl);
  if (!response.ok) throw new Error("無法下載原始分鏡圖");
  const base = Buffer.from(await response.arrayBuffer());

  const annotated = await compositeSketch(base, sketch);
  const blob = await put(
    `explainer/${input.projectId.toHexString()}/annotations/${input.clipNumber}-${input.position}-${Date.now()}.png`,
    annotated,
    { access: "public", contentType: "image/png", addRandomSuffix: false },
  );
  return blob.url;
}
