import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const MODEL = process.env.HALLOWEEN_GUIDE_IMAGE_MODEL || "gemini-2.5-flash-image";
const CACHE_PATH = path.join(process.cwd(), "src/service/blog-post/halloween-guides/previews.json");
const force = process.argv.includes("--force");
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

type PreviewMap = Record<string, string>;

type ImageJob = {
  cacheKey: string;
  scene: string;
  stem: string;
  label: string;
};

function googleImage() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY");
  return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

async function readCache(): Promise<PreviewMap> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")) as PreviewMap;
  } catch {
    return {};
  }
}

async function writeCache(cache: PreviewMap) {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

function imagePrompt(scene: string) {
  return [
    "Editorial blog still, 16:9, natural color, sharp focus, subject centered.",
    scene,
    "Absolutely no text, no letters, no numbers, no handwriting, no logos, no watermarks, no celebrity likeness, no children, no copyrighted character.",
  ].join(" ");
}

async function generatePreview(scene: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { image } = await generateImage({
        model: googleImage(),
        prompt: imagePrompt(scene),
        aspectRatio: "16:9",
      });
      return sharp(Buffer.from(image.uint8Array))
        .resize(1600, 1000, { fit: "cover", position: "attention" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (error) {
      lastError = error;
      const wait = attempt * 2000;
      console.error(`  retry ${attempt}:`, error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("image generation failed");
}

async function pool<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: size }, () => run()));
}

async function main() {
  const { persistBuffer } = await import("@/service/higgsfield/persist");
  const { HALLOWEEN_SPECS, renderHalloweenSpec } = await import("@/service/blog-post/halloween-guides");
  const { createBlogPost, getPublishedBlogPostBySlug, updateBlogPostBySlugOrId } = await import(
    "@/service/blog-post/blog-posts"
  );
  const { blogPostsCollection } = await import("@/dao/blog-posts");
  const { indexablePublishedFilter, isPartnerIntroPost } = await import(
    "@/service/blog-post/indexable"
  );

  const specs = only?.length
    ? HALLOWEEN_SPECS.filter((spec) => only.includes(spec.slug) || only.includes(String(spec.id)))
    : HALLOWEEN_SPECS;
  if (only?.length && specs.length !== only.length) {
    const found = new Set(specs.flatMap((spec) => [spec.slug, String(spec.id)]));
    const missing = only.filter((item) => !found.has(item));
    throw new Error(`Unknown guide: ${missing.join(", ")}`);
  }

  const jobs: ImageJob[] = specs.flatMap((spec) => {
    const list: ImageJob[] = [
      {
        cacheKey: spec.slug,
        scene: spec.scene,
        stem: `halloween-${spec.id}`,
        label: String(spec.id),
      },
    ];
    if (spec.figure) {
      list.push({
        cacheKey: `${spec.slug}::${spec.figure.key}`,
        scene: spec.figure.scene,
        stem: `halloween-${spec.id}-${spec.figure.key}`,
        label: `${spec.id} ${spec.figure.key}`,
      });
    }
    return list;
  });

  const cache = await readCache();
  let cacheWrite: Promise<void> = Promise.resolve();
  const remember = (key: string, url: string) => {
    cache[key] = url;
    cacheWrite = cacheWrite.then(() => writeCache(cache));
    return cacheWrite;
  };

  await pool(jobs, 2, async (job) => {
    if (!force && cache[job.cacheKey]) {
      console.log(`image skip ${job.label}`);
      return;
    }
    console.log(`image ${job.label}`);
    const webp = await generatePreview(job.scene);
    const hash = createHash("sha256").update(webp).digest("hex").slice(0, 8);
    const url = await persistBuffer(webp, `explainer/blog-posts/${job.stem}-${hash}.webp`, "image/webp");
    await remember(job.cacheKey, url);
    console.log(`  ✓ ${job.label}`);
  });
  await cacheWrite;

  for (const spec of specs) {
    const featureImage = cache[spec.slug];
    if (!featureImage) throw new Error(`missing preview for ${spec.slug}`);
    const figureUrls: Record<string, string> = {};
    if (spec.figure) {
      const figureUrl = cache[`${spec.slug}::${spec.figure.key}`];
      if (!figureUrl) throw new Error(`missing figure for ${spec.slug}`);
      figureUrls[spec.figure.key] = figureUrl;
    }
    const content = renderHalloweenSpec(spec, figureUrls);
    if (spec.figure && !content.includes(figureUrls[spec.figure.key])) {
      throw new Error(`figure missing from ${spec.slug}`);
    }
    const payload = {
      title: spec.title,
      excerpt: spec.excerpt,
      content,
      featureImage,
      tags: spec.tags,
      published: true as const,
      locale: spec.locale,
      landingPath: spec.landingPath,
    };
    const existing = await getPublishedBlogPostBySlug(spec.slug, true);
    if (!existing) {
      const created = await createBlogPost({ slug: spec.slug, ...payload });
      if (!created.ok) throw new Error(`${spec.slug}: ${created.error}`);
      if (created.post.slug !== spec.slug) {
        throw new Error(`slug changed: wanted ${spec.slug}, got ${created.post.slug}`);
      }
      console.log("created", spec.slug);
      continue;
    }
    const owned = existing.tags.includes("Halloween") || existing.title === spec.title;
    if (!owned) throw new Error(`refusing to overwrite unrelated post ${spec.slug}`);
    const updated = await updateBlogPostBySlugOrId(spec.slug, payload);
    if (!updated.ok) throw new Error(`${spec.slug}: ${updated.error}`);
    console.log("updated", spec.slug);
  }

  const slugs = specs.map((spec) => spec.slug);
  const collection = await blogPostsCollection();
  const docs = await collection
    .find({ ...indexablePublishedFilter(), slug: { $in: slugs } })
    .project({ slug: 1, title: 1, tags: 1, featureImage: 1 })
    .toArray();
  if (docs.length !== specs.length) {
    throw new Error(`indexable count ${docs.length}, expected ${specs.length}`);
  }
  for (const doc of docs) {
    if (isPartnerIntroPost({ title: doc.title, tags: doc.tags })) {
      throw new Error(`partner filter hid ${doc.slug}`);
    }
    if (!doc.featureImage?.startsWith("https://")) throw new Error(`bad image ${doc.slug}`);
  }
  console.log(`indexable ${docs.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
