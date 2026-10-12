import sharp from "sharp";
import { subtitlePlacement } from "@/service/video-edit/subtitle-placement";

type StillAspect = "9:16" | "16:9" | "1:1";

// Pixel offset of a plate already resized to subtitlePlacement's width.
// 16:9 sits above an 8% bottom inset. 9:16 and 1:1 center on 62% of the height.
// Stills do not fade; the fade belongs to the export burn of a clean video.
export function subtitleStillOffset(
  aspect: StillAspect,
  frameW: number,
  frameH: number,
  plateW: number,
  plateH: number,
) {
  const left = Math.round((frameW - plateW) / 2);
  if (aspect === "16:9") {
    const inset = Math.round(frameH * 0.08);
    return { left, top: frameH - plateH - inset };
  }
  const center = Math.round(frameH * 0.62);
  return { left, top: center - Math.round(plateH / 2) };
}

// Burn a keyed subtitle plate onto a clean scene still. Returns a PNG.
export async function compositeSubtitleStill(
  scene: Buffer,
  plate: Buffer,
  aspect: StillAspect,
) {
  const sceneMeta = await sharp(scene).metadata();
  const frameW = sceneMeta.width || 0;
  const frameH = sceneMeta.height || 0;
  if (!frameW || !frameH) throw new Error("場景圖沒有尺寸");
  const place = subtitlePlacement(aspect, frameW, frameH);
  const resized = await sharp(plate).resize({ width: place.w }).png().toBuffer();
  const plateMeta = await sharp(resized).metadata();
  const offset = subtitleStillOffset(
    aspect,
    frameW,
    frameH,
    place.w,
    plateMeta.height || 0,
  );
  return sharp(scene)
    .composite([
      {
        input: resized,
        left: Math.max(0, offset.left),
        top: Math.max(0, offset.top),
      },
    ])
    .png()
    .toBuffer();
}
