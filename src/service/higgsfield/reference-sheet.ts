import sharp from "sharp";
import { persistBuffer } from "@/service/higgsfield/persist";

// How many separate reference URLs each Higgsfield image model accepts.
export function referenceLimitForModel(model: string) {
  if (model.startsWith("marketing-studio/image")) return 16;
  if (/qwen-image-3\/edit/i.test(model)) return 3;
  if (model.startsWith("ideogram/")) return 1;
  if (model.startsWith("z-image/")) return 0;
  return 4;
}

// Keep every blueprint. Within the model cap they stay separate URLs; past
// the cap they become one contact sheet so none are dropped.
export function referenceGroups(urls: string[], max: number): "urls" | "sheet" | "none" {
  if (urls.length === 0 || max <= 0) return "none";
  if (urls.length <= max) return "urls";
  return "sheet";
}

// Lay blueprint stills in one row so a model that takes few slots still sees all of them.
export async function stackReferenceSheet(buffers: Buffer[]) {
  const tiles = await Promise.all(
    buffers.map(async (buffer) => {
      const png = await sharp(buffer)
        .resize({ height: 512, fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const meta = await sharp(png).metadata();
      return { png, width: meta.width || 512, height: meta.height || 512 };
    }),
  );
  const height = Math.max(...tiles.map((tile) => tile.height));
  let left = 0;
  const composites = tiles.map((tile) => {
    const item = { input: tile.png, left, top: 0 };
    left += tile.width;
    return item;
  });
  return sharp({
    create: { width: left, height, channels: 3, background: "#ffffff" },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載角色藍圖（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

// Returns the URL list to send as image_urls.
export async function referenceUrlsForModel(model: string, urls: string[]) {
  const max = referenceLimitForModel(model);
  const mode = referenceGroups(urls, max);
  if (mode === "none") return [];
  if (mode === "urls") return urls;
  const buffers = [];
  for (const url of urls) buffers.push(await download(url));
  const sheet = await stackReferenceSheet(buffers);
  const uploaded = await persistBuffer(
    sheet,
    `explainer/reference-sheets/${Date.now()}.png`,
    "image/png",
  );
  return [uploaded];
}
