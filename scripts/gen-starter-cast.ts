/**
 * Portraits for the five characters seeded onto new accounts.
 * Usage: npx tsx scripts/gen-starter-cast.ts
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { STARTER_CAST } from "@/service/character/starter-cast";

loadEnvConfig(process.cwd());

async function generate(id: string, file: string, prompt: string) {
  const { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } = await import(
    "@/service/openrouter/generate"
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const submitted = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt,
        aspectRatio: "9:16",
        resolution: "1k",
      });
      const url = submitted.images?.[0]?.url;
      if (!url || submitted.status === "nsfw") {
        throw new Error(submitted.error || "沒有圖片");
      }
      const bytes = url.startsWith("data:")
        ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
        : Buffer.from(await (await fetch(url)).arrayBuffer());
      const dest = path.join(process.cwd(), "public/starter-cast", file);
      await mkdir(path.dirname(dest), { recursive: true });
      const jpg = await sharp(bytes)
        .resize({ width: 720, withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
      await writeFile(dest, jpg);
      console.log("wrote", id, file, jpg.length);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`retry ${attempt}/3 for ${id}:`, error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

async function main() {
  const failures: string[] = [];
  for (const member of STARTER_CAST) {
    try {
      await generate(member.id, member.file, member.imagePrompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("fail", member.id, message);
      failures.push(`${member.id}: ${message}`);
    }
  }
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main();
