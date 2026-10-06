/**
 * Redraw each landing illustration in a different system style, then loop it with MiniMax H3.
 * Usage:
 *   npx tsx scripts/gen-landing-art.ts --images [--only=hero,cast]   # stills to tmp/landing-art
 *   npx tsx scripts/gen-landing-art.ts --videos [--only=hero,cast]   # loops from the approved stills
 *   npx tsx scripts/gen-landing-art.ts --install                     # copy approved files into public/
 */
import { loadEnvConfig } from "@next/env";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AspectRatio } from "@/model/project";

loadEnvConfig(process.cwd());

const ORIGIN = "https://www.scro.io";
const OUT_DIR = path.join(process.cwd(), "tmp/landing-art");
const POLL_MS = 5000;
const TIMEOUT_MS = 12 * 60 * 1000;

type Job = {
  id: string;
  styleId: string;
  // Current public asset used as the composition reference.
  ref: string;
  aspectRatio: AspectRatio;
  // Final size so the page layout does not shift.
  size: { width: number; height: number };
  // public/ destinations for the still and the optional loop.
  still: string;
  loop?: string;
  // Extra composition rule for this section.
  note: string;
};

const JOBS: Job[] = [
  {
    id: "hero",
    styleId: "pop-art",
    ref: "/hero/scene.png",
    aspectRatio: "16:9",
    size: { width: 1344, height: 768 },
    still: "hero/scene-pop.png",
    loop: "hero/scene-pop-loop.mp4",
    note: "Keep the creator at the desk on the far left and the two people at the poster wall on the far right. The whole middle third stays an empty flat background for a headline — no figures, no objects, no text there.",
  },
  {
    id: "hero-mobile-top",
    styleId: "pop-art",
    ref: "/hero/scene-mobile-top.png",
    aspectRatio: "16:9",
    size: { width: 900, height: 470 },
    still: "hero/scene-pop-mobile-top.png",
    note: "Keep the same subjects, framing, and empty margins. The background is a yellow field with magenta Ben-Day dots.",
  },
  {
    id: "hero-mobile-bottom",
    styleId: "pop-art",
    ref: "/hero/scene-mobile-bottom.png",
    aspectRatio: "16:9",
    size: { width: 900, height: 440 },
    still: "hero/scene-pop-mobile-bottom.png",
    note: "Keep the same subjects, framing, and empty margins. The background is the same yellow field with magenta Ben-Day dots as the rest of the hero, not cyan.",
  },
  {
    id: "free-credit",
    styleId: "clay",
    ref: "/cta/still.png",
    aspectRatio: "16:9",
    size: { width: 1376, height: 768 },
    still: "cta/still-clay.png",
    loop: "cta/loop-clay.mp4",
    note: "Keep the three vignettes left to right: a person drawing at a desk with a lamp, an open hand holding one coin, a film strip beside two people at a storyboard wall.",
  },
  {
    id: "cast",
    styleId: "ukiyo-e",
    ref: "/landing/character-cast.png",
    aspectRatio: "1:1",
    size: { width: 937, height: 866 },
    still: "landing/character-cast-ukiyo.png",
    loop: "landing/character-cast-ukiyo-loop.mp4",
    note: "Keep two people seen from behind looking at five pinned character posters on a wall.",
  },
  {
    id: "persona",
    styleId: "watercolor",
    ref: "/landing/character-persona.png",
    aspectRatio: "16:9",
    size: { width: 862, height: 664 },
    still: "landing/character-persona-watercolor.png",
    loop: "landing/character-persona-watercolor-loop.mp4",
    note: "Keep the three parts left to right: a phone showing a portrait, an arrow, the same woman standing full body, and a film strip with three frames of her.",
  },
  {
    id: "director",
    styleId: "low-poly",
    ref: "/landing/director-cost.png",
    aspectRatio: "1:1",
    size: { width: 975, height: 873 },
    still: "landing/director-cost-lowpoly.png",
    loop: "landing/director-cost-lowpoly-loop.mp4",
    note: "Keep the overflowing waste bin of rejected drawings on the left, two crossed-out posters, and the woman pointing at the approved poster with a check mark on the right.",
  },
  {
    id: "enterprise",
    styleId: "bauhaus",
    ref: "/pricing/enterprise.png",
    aspectRatio: "1:1",
    size: { width: 1024, height: 1024 },
    still: "pricing/enterprise-bauhaus.png",
    note: "Keep two business people facing each other across a meeting table with a desk lamp and one folder between them.",
  },
];

const mode = process.argv.includes("--videos")
  ? "videos"
  : process.argv.includes("--install")
    ? "install"
    : "images";
const only = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice(7)
  .split(",");
const jobs = JOBS.filter((job) => !only || only.includes(job.id));

async function loadStyle(id: string) {
  const { stylesCollection } = await import("@/dao");
  const { styleFromDoc } = await import("@/service/style/load-style");
  const style = styleFromDoc(await (await stylesCollection()).findOne({ _id: id }));
  if (!style) throw new Error(`找不到風格 ${id}`);
  return style;
}

// Poll one Higgsfield request until it has a file URL.
async function waitForMedia(submitted: { status?: string; status_url?: string }) {
  const { fetchHiggsfieldStatus, mediaUrlFromResponse } = await import("@/service/higgsfield/generate");
  const ready = mediaUrlFromResponse(submitted as never);
  if (submitted.status === "completed" && ready) return ready;
  if (!submitted.status_url) throw new Error("沒有 status url");
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(submitted.status_url);
    if (status.status === "completed") {
      const url = mediaUrlFromResponse(status);
      if (!url) throw new Error("完成但沒有檔案");
      return url;
    }
    if (status.status === "failed" || status.status === "nsfw") throw new Error(`生成 ${status.status}`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error("逾時");
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下載失敗 ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function generateStill(job: Job) {
  const { submitImage, QWEN_IMAGE_MODEL } = await import("@/service/higgsfield/generate");
  const style = await loadStyle(job.styleId);
  const prompt = [
    `Redraw the attached illustration as a ${style.name} illustration for a website section.`,
    `Keep the same composition, subjects, poses, and placement. ${job.note}`,
    `Canvas: ${style.canvas}. Look: ${style.look}. Palette: ${style.palette}.`,
    "Rich, saturated colour across the whole picture. No words, letters, logos, or watermark.",
    `Never: ${style.negatives}.`,
    `Aspect ratio ${job.aspectRatio}.`,
  ].join("\n");
  const submitted = await submitImage(
    {
      model: QWEN_IMAGE_MODEL,
      prompt,
      aspectRatio: job.aspectRatio,
      quality: "high",
      referenceImageUrls: [`${ORIGIN}${job.ref}`],
    },
    { webhook: false },
  );
  const url = await waitForMedia(submitted);
  const buffer = await sharp(await download(url))
    .resize(job.size.width, job.size.height, { fit: "cover" })
    .png()
    .toBuffer();
  const file = path.join(OUT_DIR, `${job.id}.png`);
  await writeFile(file, buffer);
  // The loop step needs a public URL for the start and end frame.
  await writeFile(path.join(OUT_DIR, `${job.id}.url`), url);
  return file;
}

async function generateLoop(job: Job) {
  const { submitClipVideo } = await import("@/service/higgsfield/generate");
  const style = await loadStyle(job.styleId);
  const frameUrl = (await readFile(path.join(OUT_DIR, `${job.id}.url`), "utf8")).trim();
  const submitted = await submitClipVideo({
    prompt: `Seamless ambient loop of this ${style.name} illustration. Locked camera. Small gentle motion only: people breathe, shift weight, and gesture slightly; papers and small details sway. ${style.motion}. The last frame matches the first frame exactly. No new objects, no text.`,
    aspectRatio: job.aspectRatio,
    durationSeconds: 5,
    startImageUrl: frameUrl,
    endImageUrl: frameUrl,
  });
  const url = await waitForMedia(submitted);
  const file = path.join(OUT_DIR, `${job.id}.mp4`);
  await writeFile(file, await download(url));
  return file;
}

async function install(job: Job) {
  const publicDir = path.join(process.cwd(), "public");
  await copyFile(path.join(OUT_DIR, `${job.id}.png`), path.join(publicDir, job.still));
  if (job.loop) await copyFile(path.join(OUT_DIR, `${job.id}.mp4`), path.join(publicDir, job.loop));
  return job.still;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const run = mode === "videos" ? generateLoop : mode === "install" ? install : generateStill;
  const targets = mode === "videos" ? jobs.filter((job) => job.loop) : jobs;
  const results = await Promise.allSettled(targets.map(async (job) => {
    console.log(mode, job.id, job.styleId);
    const file = await run(job);
    console.log("  ✓", job.id, file);
  }));
  const failed = results.filter((result) => result.status === "rejected");
  for (const result of failed) console.error("  ✗", (result as PromiseRejectedResult).reason);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
