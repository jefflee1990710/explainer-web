import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const CACHE_PATH = path.join(
  process.cwd(),
  "src/service/blog-post/visual-playbooks/previews.json",
);
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
    "Editorial blog reference still, 16:9 widescreen, natural color, sharp focus, subject centered.",
    scene,
    "Absolutely no text, no letters, no numbers, no handwriting, no logos, no watermarks, no celebrity likeness, no children.",
  ].join(" ");
}

async function outputUrlToBuffer(outputUrl: string): Promise<Buffer> {
  if (outputUrl.startsWith("data:")) {
    const comma = outputUrl.indexOf(",");
    if (comma === -1) throw new Error("Invalid data URL from OpenRouter");
    return Buffer.from(outputUrl.slice(comma + 1), "base64");
  }
  const res = await fetch(outputUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch generated image (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function generateSeedreamWebp(scene: string): Promise<Buffer> {
  const {
    OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    submitOpenRouterImage,
  } = await import("@/service/openrouter/generate");

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt: imagePrompt(scene),
        aspectRatio: "16:9",
        resolution: "1k",
      });
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error(result.error || "Seedream 5.0 Pro did not return an image URL");
      }
      const rawBuffer = await outputUrlToBuffer(imageUrl);
      return await sharp(rawBuffer)
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
  throw lastError instanceof Error ? lastError : new Error("Seedream image generation failed");
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
  const { VISUAL_PLAYBOOK_SPECS, renderVisualPlaybookSpec } = await import(
    "@/service/blog-post/visual-playbooks"
  );
  const {
    createBlogPost,
    getPublishedBlogPostBySlug,
    updateBlogPostBySlugOrId,
  } = await import("@/service/blog-post/blog-posts");
  const { blogPostsCollection } = await import("@/dao/blog-posts");
  const { indexablePublishedFilter } = await import("@/service/blog-post/indexable");

  const specs = only?.length
    ? VISUAL_PLAYBOOK_SPECS.filter(
        (spec) => only.includes(spec.slug) || only.includes(String(spec.id)),
      )
    : VISUAL_PLAYBOOK_SPECS;

  const jobs: ImageJob[] = specs.flatMap((spec) => [
    {
      cacheKey: spec.slug,
      scene: spec.scene,
      stem: `playbook-${spec.id}-hero`,
      label: `#${spec.id} hero (${spec.slug})`,
    },
    ...spec.examples.map((ex) => ({
      cacheKey: `${spec.slug}::${ex.key}`,
      scene: ex.scene,
      stem: `playbook-${spec.id}-${ex.key}`,
      label: `#${spec.id} ${ex.key}`,
    })),
  ]);

  const cache = await readCache();
  let cacheWrite: Promise<void> = Promise.resolve();
  const remember = (key: string, url: string) => {
    cache[key] = url;
    cacheWrite = cacheWrite.then(() => writeCache(cache));
    return cacheWrite;
  };

  let completedCount = 0;
  const totalJobs = jobs.length;

  await pool(jobs, 12, async (job) => {
    if (!force && cache[job.cacheKey]) {
      completedCount += 1;
      console.log(`[${completedCount}/${totalJobs}] skip ${job.label}`);
      return;
    }
    console.log(`[start] ${job.label}`);
    const webp = await generateSeedreamWebp(job.scene);
    const hash = createHash("sha256").update(webp).digest("hex").slice(0, 8);
    const url = await persistBuffer(
      webp,
      `explainer/blog-posts/${job.stem}-${hash}.webp`,
      "image/webp",
    );
    await remember(job.cacheKey, url);
    completedCount += 1;
    console.log(`  ✓ [${completedCount}/${totalJobs}] ${job.label} -> ${url}`);
  });
  await cacheWrite;

  for (const spec of specs) {
    const featureImage = cache[spec.slug];
    if (!featureImage) throw new Error(`Missing featureImage for ${spec.slug}`);
    for (const ex of spec.examples) {
      if (!cache[`${spec.slug}::${ex.key}`]) {
        throw new Error(`Missing inline example image ${ex.key} for ${spec.slug}`);
      }
    }
    const content = renderVisualPlaybookSpec(spec, cache);
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
      console.log(`created https://www.scro.io/posts/${created.post.slug}`);
    } else {
      const updated = await updateBlogPostBySlugOrId(spec.slug, payload);
      if (!updated.ok) throw new Error(`${spec.slug}: ${updated.error}`);
      console.log(`updated https://www.scro.io/posts/${updated.post.slug}`);
    }
  }

  const slugs = specs.map((spec) => spec.slug);
  const collection = await blogPostsCollection();
  const docs = await collection
    .find({ ...indexablePublishedFilter(), slug: { $in: slugs } })
    .project({ slug: 1, title: 1, featureImage: 1 })
    .toArray();
  if (docs.length !== specs.length) {
    throw new Error(`Indexable count ${docs.length}, expected ${specs.length}`);
  }
  console.log(`\n✅ All ${docs.length} visual playbook posts published and indexable!`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
