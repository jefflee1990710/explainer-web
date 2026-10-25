import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import {
  createAcademyCourse,
  updateAcademyCourseBySlugOrId,
} from "@/service/academy/courses";
import {
  assembleLessonMarkdown,
  lessonMediaReady,
  type LessonMediaUrls,
  type ReadyLessonMedia,
} from "@/service/academy/catalog/assemble";
import { ACADEMY_LESSONS } from "@/service/academy/catalog/lessons";
import { academyImagePrompt } from "@/service/academy/catalog/prompts";
import {
  ACADEMY_LESSON_VIDEO_VERSION,
  ACADEMY_VIDEO_BEAT_SECONDS,
  academyLessonNeedsVideo,
  academyLessonVideoBeats,
} from "@/service/academy/catalog/video";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HEYGEN_VIDEO_1_MODEL,
  OPENROUTER_VIDEOS_URL,
  submitOpenRouterImage,
  assertOpenRouterKey,
  capOpenRouterVideoPrompt,
} from "@/service/openrouter/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { concatMp4Urls } from "@/service/reel/concat";

loadEnvConfig(process.cwd());

const IMAGE_MODEL = "tencent/hy-image-v3.5-preview";
const MEDIA_PATH = path.join(
  process.cwd(),
  "src/service/academy/catalog/lesson-media.json",
);
const force = process.argv.includes("--force");
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

type MediaMap = Record<string, LessonMediaUrls>;

let saveChain: Promise<void> = Promise.resolve();

async function readMedia(): Promise<MediaMap> {
  try {
    return JSON.parse(await readFile(MEDIA_PATH, "utf8")) as MediaMap;
  } catch {
    return {};
  }
}

function remember(slug: string, patch: LessonMediaUrls) {
  saveChain = saveChain.then(async () => {
    const current = await readMedia();
    current[slug] = { ...current[slug], ...patch };
    await mkdir(path.dirname(MEDIA_PATH), { recursive: true });
    await writeFile(MEDIA_PATH, `${JSON.stringify(current, null, 2)}\n`);
  });
  return saveChain;
}

function extensionFor(contentType: string, fallback: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  return fallback;
}

function uniquePath(pathname: string) {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return pathname.replace(/(\.[a-z0-9]+)$/i, `-${stamp}$1`);
}

async function storeGenerated(source: string, pathname: string, fallbackType: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  const target = uniquePath(pathname);
  if (source.startsWith("data:")) {
    const match = source.match(/^data:([^;,]+);base64,([\s\S]+)$/);
    const contentType = match?.[1] || fallbackType;
    const buffer = Buffer.from(match?.[2] || "", "base64");
    const ext = extensionFor(contentType, target.split(".").pop() || "bin");
    const named = target.replace(/\.[a-z0-9]+$/i, `.${ext}`);
    const blob = await put(named, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }
  return persistMedia(source, target);
}

async function generateImage(prompt: string) {
  let lastError = "OpenRouter returned no image";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const submitted = await submitOpenRouterImage({
      model: IMAGE_MODEL,
      prompt,
      aspectRatio: "16:9",
      resolution: "1k",
    });
    const url = submitted.images?.[0]?.url;
    if (url) return url;
    lastError = submitted.error || lastError;
    console.warn(`image attempt ${attempt} failed: ${lastError}`);
  }
  throw new Error(lastError);
}

async function storeBuffer(buffer: Buffer, pathname: string, contentType: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  const target = uniquePath(pathname);
  const ext = extensionFor(contentType, target.split(".").pop() || "bin");
  const named = target.replace(/\.[a-z0-9]+$/i, `.${ext}`);
  const blob = await put(named, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

async function submitVideo(
  prompt: string,
  firstFrameUrl: string,
  resolution: "768p" | "480p",
  durationSeconds = ACADEMY_VIDEO_BEAT_SECONDS,
) {
  const key = assertOpenRouterKey();
  const response = await fetch(OPENROUTER_VIDEOS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_HEYGEN_VIDEO_1_MODEL,
      prompt: capOpenRouterVideoPrompt(prompt),
      aspect_ratio: "16:9",
      duration: durationSeconds,
      resolution,
      generate_audio: true,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: firstFrameUrl },
          frame_type: "first_frame",
        },
      ],
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    polling_url?: string;
    error?: { message?: string } | string;
  };
  if (!response.ok || !body.id) {
    const message =
      typeof body.error === "string" ? body.error : body.error?.message || response.statusText;
    throw new Error(message || `video submit failed (${response.status})`);
  }
  const statusUrl = body.polling_url
    ? new URL(body.polling_url, "https://openrouter.ai").toString()
    : `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(body.id)}`;
  return statusUrl;
}

async function waitForVideo(statusUrl: string) {
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const status = await fetchOpenRouterStatus(statusUrl);
    if (status.status === "completed" && status.video?.url) return status.video.url;
    if (status.status === "failed" || status.status === "nsfw") {
      throw new Error(status.error || status.status);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("video timed out");
}

async function generateVideo(
  prompt: string,
  firstFrameUrl: string,
  durationSeconds = ACADEMY_VIDEO_BEAT_SECONDS,
) {
  try {
    const statusUrl = await submitVideo(prompt, firstFrameUrl, "768p", durationSeconds);
    return await waitForVideo(statusUrl);
  } catch (error) {
    console.warn("768p video failed, retrying 480p", error instanceof Error ? error.message : error);
    const statusUrl = await submitVideo(prompt, firstFrameUrl, "480p", durationSeconds);
    return await waitForVideo(statusUrl);
  }
}

// Four 15s OpenRouter beats, then ffmpeg concat into one ~60s lesson video.
async function generateLessonVideo(slug: string, image1: string, image2: string) {
  const lesson = ACADEMY_LESSONS.find((item) => item.slug === slug);
  if (!lesson) throw new Error(`missing lesson ${slug}`);
  const frames = { image1, image2 };
  const clipUrls: string[] = [];
  for (const beat of academyLessonVideoBeats(lesson)) {
    console.log(`video ${slug} beat ${beat.beatIndex + 1}/${beat.beatCount}`);
    const raw = await generateVideo(beat.prompt, frames[beat.frame], beat.durationSeconds);
    clipUrls.push(
      await storeGenerated(
        raw,
        `explainer/academy/lessons/${slug}-beat${beat.beatIndex + 1}.mp4`,
        "video/mp4",
      ),
    );
  }
  const joined = await concatMp4Urls(clipUrls, 5 * 60 * 1000);
  return storeBuffer(joined, `explainer/academy/lessons/${slug}.mp4`, "video/mp4");
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  async function run() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

async function upsertLesson(slug: string, media: ReadyLessonMedia) {
  const lesson = ACADEMY_LESSONS.find((item) => item.slug === slug);
  if (!lesson) throw new Error(`missing lesson ${slug}`);
  const content = assembleLessonMarkdown(lesson, media);
  const payload = {
    title: lesson.title,
    slug: lesson.slug,
    excerpt: lesson.excerpt,
    module: lesson.module,
    content,
    coverImage: media.image1,
    published: true,
    sortOrder: lesson.sortOrder,
  };
  const updated = await updateAcademyCourseBySlugOrId(lesson.slug, payload);
  if (updated.ok) return updated.course.slug;
  if (!updated.notFound) throw new Error(updated.error);
  const created = await createAcademyCourse(payload);
  if (!created.ok) throw new Error(created.error);
  return created.course.slug;
}

async function main() {
  const selected = ACADEMY_LESSONS.filter((lesson) => !only || only.includes(lesson.slug));
  if (selected.length === 0) throw new Error("no lessons matched --only");
  const failures: string[] = [];

  await pool(selected, 4, async (lesson) => {
    try {
      const current = (await readMedia())[lesson.slug] || {};
      let image1 = !force && current.image1 ? current.image1 : "";
      let image2 = !force && current.image2 ? current.image2 : "";
      if (!image1 || !image2) {
        console.log(`images ${lesson.slug}`);
        const [raw1, raw2] = await Promise.all([
          image1 ? Promise.resolve("") : generateImage(academyImagePrompt(lesson.images[0].prompt)),
          image2 ? Promise.resolve("") : generateImage(academyImagePrompt(lesson.images[1].prompt)),
        ]);
        if (!image1 && raw1) {
          image1 = await storeGenerated(
            raw1,
            `explainer/academy/lessons/${lesson.slug}-1.png`,
            "image/png",
          );
          await remember(lesson.slug, { image1 });
        }
        if (!image2 && raw2) {
          image2 = await storeGenerated(
            raw2,
            `explainer/academy/lessons/${lesson.slug}-2.png`,
            "image/png",
          );
          await remember(lesson.slug, { image2 });
        }
      }
      let video = current.video || "";
      let videoVersion = current.videoVersion;
      if (academyLessonNeedsVideo(current, force)) {
        video = await generateLessonVideo(lesson.slug, image1, image2);
        videoVersion = ACADEMY_LESSON_VIDEO_VERSION;
        await remember(lesson.slug, { video, videoVersion });
      }
      const media = { image1, image2, video, videoVersion };
      if (!lessonMediaReady(media)) throw new Error("media incomplete");
      const saved = await upsertLesson(lesson.slug, media);
      console.log(`saved ${saved}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${lesson.slug}: ${message}`);
      console.error(`failed ${lesson.slug}: ${message}`);
    }
  });

  if (failures.length > 0) {
    console.error(`\n${failures.length} lesson(s) failed`);
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }
  console.log(`seeded ${selected.length} lesson(s)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
