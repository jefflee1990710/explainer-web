import { writeFileSync, readFileSync } from "node:fs";
import { Agent, fetch as undiciFetch } from "undici";
import { loadEnvConfig } from "@next/env";
import sharp from "sharp";
import { persistBuffer } from "@/service/higgsfield/persist";
import { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL } from "@/service/openrouter/generate";

loadEnvConfig(process.cwd());

const agent = new Agent({
  headersTimeout: 600_000,
  bodyTimeout: 600_000,
  connectTimeout: 30_000,
});

const longFetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  undiciFetch(input as string, {
    ...(init as object),
    dispatcher: agent,
  })) as unknown as typeof fetch;

async function main() {
  const portrait = readFileSync("/tmp/scro-ig-reel/stills/portrait.jpg");
  const portraitUrl = await persistBuffer(portrait, "ig-reel/portrait.jpg", "image/jpeg");
  const started = Date.now();
  try {
    const result = await submitOpenRouterImage(
      {
      model: OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL,
      prompt:
        "Same woman as the reference photo. She laughs with one friend at a restaurant table, warm light, vertical, no text.",
      aspectRatio: "9:16",
      resolution: "2k",
        referenceImageUrls: [portraitUrl],
      },
      { fetch: longFetch },
    );
    const url = result.images?.[0]?.url;
    if (!url) throw new Error(result.error || "no image");
    const match = url.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    const raw = match ? Buffer.from(match[1], "base64") : Buffer.from(await (await fetch(url)).arrayBuffer());
    const out = await sharp(raw).resize(1080, 1920, { fit: "cover", position: "attention" }).jpeg({ quality: 90 }).toBuffer();
    writeFileSync("/tmp/scro-ig-reel/stills/friends.jpg", out);
    console.log("saved", out.length, `${Date.now() - started}ms`);
  } catch (error) {
    const cause = error instanceof Error ? (error as Error & { cause?: { code?: string; message?: string } }).cause : undefined;
    console.log("FAIL", `${Date.now() - started}ms`, error instanceof Error ? error.message : error, cause?.code || cause?.message || "");
    process.exit(1);
  }
}

main();
