import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const MODEL = process.env.SEASON_GUIDE_IMAGE_MODEL || "gemini-2.5-flash-image";
const force = process.argv.includes("--force");
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

const batchName = process.argv.slice(2).find((argument) => !argument.startsWith("-"));

type PreviewMap = Record<string, string>;

type ImageJob = {
  cacheKey: string;
  scene: string;
  stem: string;
  label: string;
};

type Batch = {
  tag: string;
  dir: string;
  stem: string;
  load: () => Promise<{ specs: { id: number; slug: string; title: string; excerpt: string; locale: "en" | "zh-Hant" | "zh-Hans"; landingPath: string; tags: string[]; scene: string }[]; render: (spec: never) => string }>;
};

const BATCHES: Record<string, Batch> = {
  christmas: {
    tag: "Christmas",
    dir: "christmas-guides",
    stem: "christmas",
    load: async () => {
      const mod = await import("@/service/blog-post/christmas-guides");
      return { specs: mod.CHRISTMAS_SPECS, render: mod.renderChristmasSpec as (spec: never) => string };
    },
  },
  "new-year": {
    tag: "New Year",
    dir: "new-year-guides",
    stem: "new-year",
    load: async () => {
      const mod = await import("@/service/blog-post/new-year-guides");
      return { specs: mod.NEW_YEAR_SPECS, render: mod.renderNewYearSpec as (spec: never) => string };
    },
  },
  lunar: {
    tag: "Lunar New Year",
    dir: "lunar-new-year-guides",
    stem: "lunar",
    load: async () => {
      const mod = await import("@/service/blog-post/lunar-new-year-guides");
      return { specs: mod.LUNAR_NEW_YEAR_SPECS, render: mod.renderLunarNewYearSpec as (spec: never) => string };
    },
  },
};

function googleImage() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY");
  return createGoogleGenerativeAI({ apiKey }).image(MODEL);
}

async function readCache(cachePath: string): Promise<PreviewMap> {
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as PreviewMap;
  } catch {
    return {};
  }
}

async function writeCache(cachePath: string, cache: PreviewMap) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
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

async function seedBatch(name: string) {
  const batch = BATCHES[name];
  if (!batch) throw new Error(`Unknown batch ${name}. Use christmas, new-year, or lunar.`);
  const { persistBuffer } = await import("@/service/higgsfield/persist");
  const { createBlogPost, getPublishedBlogPostBySlug, updateBlogPostBySlugOrId } = await import(
    "@/service/blog-post/blog-posts"
  );
  const { blogPostsCollection } = await import("@/dao/blog-posts");
  const { indexablePublishedFilter, isPartnerIntroPost } = await import("@/service/blog-post/indexable");
  const loaded = await batch.load();
  const specs = only?.length
    ? loaded.specs.filter((spec) => only.includes(spec.slug) || only.includes(String(spec.id)))
    : loaded.specs;
  if (only?.length && specs.length !== only.length) {
    const found = new Set(specs.flatMap((spec) => [spec.slug, String(spec.id)]));
    const missing = only.filter((item) => !found.has(item));
    throw new Error(`Unknown guide: ${missing.join(", ")}`);
  }

  const cachePath = path.join(process.cwd(), "src/service/blog-post", batch.dir, "previews.json");
  const jobs: ImageJob[] = specs.map((spec) => ({
    cacheKey: spec.slug,
    scene: spec.scene,
    stem: `${batch.stem}-${spec.id}`,
    label: `${name} ${spec.id}`,
  }));
  const cache = await readCache(cachePath);
  let cacheWrite: Promise<void> = Promise.resolve();
  const remember = (key: string, url: string) => {
    cache[key] = url;
    cacheWrite = cacheWrite.then(() => writeCache(cachePath, cache));
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
    const content = loaded.render(spec as never);
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
    const owned = existing.tags.includes(batch.tag) || existing.title === spec.title;
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
    if (isPartnerIntroPost({ title: String(doc.title), tags: doc.tags as string[] | undefined })) {
      throw new Error(`partner filter hid ${doc.slug}`);
    }
    if (!String(doc.featureImage).startsWith("https://")) throw new Error(`bad image ${doc.slug}`);
  }
  console.log(`${name} indexable ${docs.length}`);
}

async function main() {
  const names = batchName && batchName !== "all" ? [batchName] : Object.keys(BATCHES);
  if (batchName && batchName !== "all" && !BATCHES[batchName]) {
    throw new Error(`Unknown batch ${batchName}. Use christmas, new-year, lunar, or all.`);
  }
  for (const name of names) {
    await seedBatch(name);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
