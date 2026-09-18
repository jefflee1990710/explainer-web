import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { stylesCollection } from "../src/lib/collections";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitImage,
} from "../src/lib/higgsfield/generate";
import { flattenToCanvas } from "../src/lib/higgsfield/flatten";
import { persistMedia } from "../src/lib/higgsfield/persist";
import {
  STYLE_IDS,
  STYLE_PREVIEW_SCENE,
  STYLES,
  styleLetteringLine,
  styleLinesForFrame,
} from "../src/lib/styles";

loadEnvConfig(process.cwd());

const MODEL = "openai/gpt-image-1.5";
const QUALITY = "medium" as const;
const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;
// Picker cards are ~200px wide; 768px covers 3x DPR with room to spare.
const THUMB_WIDTH = 768;
const THUMB_QUALITY = 82;

type StyleIdType = (typeof STYLE_IDS)[number];

const force = process.argv.includes("--force");
// `--thumbs`: rebuild only the WebP thumbnails from stored full images.
// No image generation, no credits.
const thumbsOnly = process.argv.includes("--thumbs");
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",");

function previewPrompt(id: StyleIdType) {
  const style = STYLES[id];
  return [
    ...styleLinesForFrame(style),
    STYLE_PREVIEW_SCENE,
    styleLetteringLine(style),
    "The label must read exactly IDEA.",
    "Aspect ratio 16:9.",
  ].join("\n");
}

async function waitForImage(statusUrl: string) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(statusUrl);
    if (status.status === "completed") {
      const url = mediaUrlFromResponse(status);
      if (!url) throw new Error("completed without image");
      return url;
    }
    if (status.status === "failed" || status.status === "nsfw") {
      throw new Error(`generation ${status.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error("timed out");
}

// Downscale the stored full PNG to a WebP thumbnail and persist it next to it.
async function persistThumbnail(id: StyleIdType, fullUrl: string) {
  return persistMedia(fullUrl, `explainer/styles/${id}-preview.webp`, {
    transform: (buffer) =>
      sharp(buffer)
        .resize({ width: THUMB_WIDTH })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer(),
    contentType: "image/webp",
  });
}

// Rebuild thumbnails for every style that already has a full image.
async function rebuildThumbnails() {
  const styles = await stylesCollection();
  let failed = 0;
  for (const id of STYLE_IDS) {
    if (only && !only.includes(id)) continue;
    const existing = await styles.findOne({ _id: id });
    // Docs seeded before thumbnails exist hold the full PNG in `previewUrl`.
    const fullUrl = existing?.previewFullUrl ?? existing?.previewUrl;
    if (!fullUrl) {
      console.log(`skip ${id} (no preview yet)`);
      continue;
    }
    try {
      console.log(`thumb ${id}…`);
      const previewUrl = await persistThumbnail(id, fullUrl);
      await styles.updateOne(
        { _id: id },
        {
          $set: {
            previewFullUrl: fullUrl,
            previewUrl,
            updatedAt: new Date(),
          },
        },
      );
      console.log(`  ✓ ${previewUrl}`);
    } catch (error) {
      failed++;
      console.error(
        `  ✗ ${id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return failed;
}

async function generatePreviews() {
  const styles = await stylesCollection();
  let failed = 0;
  for (const id of STYLE_IDS) {
    if (only && !only.includes(id)) continue;
    const prompt = previewPrompt(id);
    const hash = createHash("sha256")
      .update(`${prompt}|${MODEL}|${QUALITY}`)
      .digest("hex");
    const existing = await styles.findOne({ _id: id });
    if (!force && existing?.previewUrl && existing.previewHash === hash) {
      console.log(`skip ${id} (up to date)`);
      continue;
    }
    try {
      console.log(`generate ${id}…`);
      const submitted = await submitImage(
        {
          model: MODEL,
          prompt,
          aspectRatio: "16:9",
          quality: QUALITY,
          resolution: "1k",
        },
        { webhook: false },
      );
      const url = await waitForImage(submitted.status_url);
      // Full-size PNG first, then the picker thumbnail derived from it.
      const previewFullUrl = await persistMedia(
        url,
        `explainer/styles/${id}`,
        {
          transform: (buffer) =>
            flattenToCanvas(buffer, STYLES[id].canvasColor),
        },
      );
      const previewUrl = await persistThumbnail(id, previewFullUrl);
      await styles.updateOne(
        { _id: id },
        {
          $set: {
            previewFullUrl,
            previewUrl,
            previewHash: hash,
            previewRequestId: submitted.request_id,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      console.log(`  ✓ ${previewUrl}`);
    } catch (error) {
      failed++;
      console.error(
        `  ✗ ${id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return failed;
}

async function main() {
  const failed = thumbsOnly ? await rebuildThumbnails() : await generatePreviews();
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
