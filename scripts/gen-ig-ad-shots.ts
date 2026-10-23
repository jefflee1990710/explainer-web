import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

loadEnvConfig(process.cwd());

const ROOT = "/tmp/scro-ig-reel";
const STILLS = path.join(ROOT, "stills");
const CLIPS = path.join(ROOT, "clips");
const FACE =
  "The same East Asian woman, about 26, from Hong Kong: shoulder-length straight black hair, warm brown eyes, light gold hoop earrings.";

const OUTFITS = [
  {
    id: "ootd-blazer",
    prompt: `${FACE} Recreate the reference full-body photo exactly: same face, same stance, same feet, same hands at her sides, same mirror on the left, same bed on the right, same camera height. Change only the clothes to a black tailored blazer, plain white t-shirt, and straight blue jeans, with the same white sneakers. Photoreal, vertical. No text, no logo.`,
  },
  {
    id: "ootd-coat",
    prompt: `${FACE} Recreate the reference full-body photo exactly: same face, same stance, same feet, same hands at her sides, same mirror on the left, same bed on the right, same camera height. Change only the clothes to a camel wool coat over a black top and beige trousers, with the same white sneakers. Photoreal, vertical. No text, no logo.`,
  },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

function imageBuffer(url: string) {
  const match = url.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

async function stillJpeg(prompt: string, refs: string[], file: string) {
  if (existsSync(file) && readFileSync(file).length > 20_000) {
    console.log("reuse still", path.basename(file));
    return readFileSync(file);
  }
  const models = [OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL, OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL];
  let last = "image failed";
  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await submitOpenRouterImage({
          model,
          prompt,
          aspectRatio: "9:16",
          resolution: model === OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL ? "2k" : "1k",
          referenceImageUrls: refs,
        });
        const url = result.images?.[0]?.url;
        if (!url) throw new Error(result.error || "OpenRouter 未回傳圖片");
        const raw = imageBuffer(url) ?? Buffer.from(await (await fetch(url)).arrayBuffer());
        const jpeg = await sharp(raw).resize(1080, 1920, { fit: "cover", position: "attention" }).jpeg({ quality: 90 }).toBuffer();
        writeFileSync(file, jpeg);
        console.log("still", path.basename(file), model, jpeg.length);
        return jpeg;
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
        console.log("still retry", path.basename(file), attempt, last.slice(0, 180));
        await sleep(6000);
      }
    }
  }
  throw new Error(last);
}

async function pollVideo(statusUrl: string) {
  const deadline = Date.now() + 12 * 60_000;
  while (Date.now() < deadline) {
    const status = await fetchOpenRouterStatus(statusUrl);
    if (status.status === "completed" && status.video?.url) return status.video.url;
    if (status.status === "failed" || status.status === "nsfw") throw new Error(status.error || status.status);
    await sleep(8000);
  }
  throw new Error("video timed out");
}

async function clipFromFrames(id: string, motion: string, startUrl: string, endUrl?: string) {
  const file = path.join(CLIPS, `${id}.mp4`);
  if (existsSync(file) && readFileSync(file).length > 100_000) {
    console.log("reuse clip", id);
    return file;
  }
  let last = "video failed";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const submitted = await submitOpenRouterClipVideo(
        {
          model: OPENROUTER_HAILUO_3_VIDEO_MODEL,
          prompt: motion,
          aspectRatio: "9:16",
          durationSeconds: 5,
          startImageUrl: startUrl,
          endImageUrl: endUrl,
        },
        { callbackUrl: null },
      );
      if (!submitted.status_url) throw new Error(submitted.error || "沒有 status url");
      console.log("video queued", id, submitted.request_id);
      const remote = await pollVideo(submitted.status_url);
      const headers = remote.includes("openrouter.ai")
        ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
        : undefined;
      const response = await fetch(remote, headers ? { headers } : undefined);
      if (!response.ok) throw new Error(`download ${response.status}`);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      console.log("video saved", id, readFileSync(file).length);
      return file;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      console.log("video retry", id, attempt, last.slice(0, 220));
      await sleep(5000);
    }
  }
  throw new Error(`${id}: ${last}`);
}

async function concatSwap(left: string, right: string) {
  const dest = path.join(CLIPS, "ootd-swap.mp4");
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  await run(ffmpegPath, [
    "-y",
    "-i",
    left,
    "-i",
    right,
    "-filter_complex",
    "[0:v]setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v]",
    "-map",
    "[v]",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-crf",
    "18",
    dest,
  ]);
  console.log("swap", dest);
}

async function main() {
  mkdirSync(STILLS, { recursive: true });
  mkdirSync(CLIPS, { recursive: true });
  const portraitUrl = await persistBuffer(readFileSync(path.join(STILLS, "portrait.jpg")), "ig-reel/portrait.jpg", "image/jpeg");
  const ootdUrl = await persistBuffer(readFileSync(path.join(STILLS, "ootd.jpg")), "ig-reel/ootd.jpg", "image/jpeg");

  const watchPath = path.join(STILLS, "watch-talk.jpg");
  const watch = await stillJpeg(
    `${FACE} Photoreal vertical photo, third-person camera in a bright living room. Foreground: the back of a friend's head and shoulder, softly out of focus, watching her. She sits across from them in a black top, three-quarter view, mouth open mid-sentence, speaking to that friend, not to the camera. Natural daylight, real-time candid. No text, no logo, no watermark.`,
    [portraitUrl],
    watchPath,
  );
  const watchUrl = await persistBuffer(watch, "ig-reel/watch-talk.jpg", "image/jpeg");

  const outfitUrls: string[] = [ootdUrl];
  for (const outfit of OUTFITS) {
    const jpeg = await stillJpeg(outfit.prompt, [portraitUrl, ootdUrl], path.join(STILLS, `${outfit.id}.jpg`));
    outfitUrls.push(await persistBuffer(jpeg, `ig-reel/${outfit.id}.jpg`, "image/jpeg"));
  }
  if (process.argv.includes("--stills")) {
    console.log("stills ready");
    return;
  }

  const watchMotion =
    "Third-person view at normal real-time speed. She speaks naturally to the friend who is watching her. The listener stays in the foreground. Steady camera. No slow motion, no text, no logos.";
  const swapMotion =
    "She holds the exact same standing pose at normal real-time speed. Only the clothes change from the first frame to the last frame. Face, hair, room, feet, and camera stay locked. No slow motion, no extra people, no text.";

  const [watchFile, swapA, swapB] = await Promise.all([
    clipFromFrames("watch-talk", watchMotion, watchUrl),
    clipFromFrames("ootd-blazer", swapMotion, outfitUrls[0], outfitUrls[1]),
    clipFromFrames("ootd-coat", swapMotion, outfitUrls[1], outfitUrls[2]),
  ]);
  await concatSwap(swapA, swapB);
  console.log("shots", watchFile);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
