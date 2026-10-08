import { writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import sharp from "sharp";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
  submitImage,
} from "@/service/higgsfield/generate";
import {
  SYSTEM_TEXT_STYLE_ORDER,
  systemTextStylePreview,
  textStylePreviewPrompt,
} from "@/service/director/subtitle-look";

loadEnvConfig(process.cwd());

const QUALITY = "medium" as const;
const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",");

async function waitForImage(submitted: {
  status?: string;
  status_url?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
}) {
  const ready = mediaUrlFromResponse(submitted);
  if (submitted.status === "completed" && ready) return ready;
  if (!submitted.status_url) throw new Error("no status url");

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(submitted.status_url);
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

// One still per system text style, from that style's lettering guideline.
async function main() {
  const route = IMAGE_ROUTE_BY_SCENE_TEXT.en;
  let failed = 0;
  for (const look of SYSTEM_TEXT_STYLE_ORDER) {
    if (only && !only.includes(look)) continue;
    const file = `public${systemTextStylePreview(look)}`;
    try {
      const prompt = textStylePreviewPrompt(look);
      console.log(`generate ${look}…`);
      const submitted = await submitImage(
        {
          model: route.model,
          prompt,
          aspectRatio: "16:9",
          quality: QUALITY,
          resolution: "1k",
          sceneTextLanguage: "en",
        },
        { webhook: false },
      );
      const url = await waitForImage(submitted);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`無法下載預覽（${response.status}）`);
      const png = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer();
      await writeFile(file, png);
      console.log(`  ✓ ${file}`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${look}:`, error instanceof Error ? error.message : error);
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
