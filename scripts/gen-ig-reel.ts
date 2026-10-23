import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { persistBuffer } from "@/service/higgsfield/persist";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

loadEnvConfig(process.cwd());

const OUT = "/tmp/scro-ig-reel";
const DOWNLOAD = "/Users/jefflee/Downloads/scro-ig-reel.mp4";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FACE =
  "The same East Asian woman, about 26, from Hong Kong: shoulder-length straight black hair with a soft side part, warm brown eyes, light gold hoop earrings, natural makeup, photoreal skin.";

const SCENES = [
  {
    id: "talking-head",
    still: `${FACE} Medium close-up in a bright airy living room, cream sofa, soft daylight. She looks into the lens as if starting to speak, calm smile. Vertical photo. No text, no logo, no watermark.`,
    motion:
      "She speaks to the camera with a warm smile, natural blinks, a small nod, and a light hand gesture. Steady camera. Keep the same face and room. No text, no logos.",
  },
  {
    id: "explainer",
    still: `${FACE} She stands in a bright studio beside a whiteboard of simple unlabeled circles and arrows only, no letters or numbers. Teaching pose, one hand raised. Vertical photo. No text, no logo, no watermark.`,
    motion:
      "She explains to the camera and gently points at the blank diagram. Soft push-in. Same face. No letters or numbers appear. No logos.",
  },
  {
    id: "ootd",
    still: `${FACE} Full-length outfit photo in a sunlit bedroom. Cream shirt, dark trousers, white sneakers. She shows the look to the camera, a mirror at the side. Vertical photo. No text, no logo, no watermark.`,
    motion:
      "She turns a little to show the outfit, fabric moves naturally, small smile. Same face and clothes. No text, no logos.",
  },
  {
    id: "daily",
    still: `${FACE} Candid cafe by a window, iced coffee on the wooden table, soft afternoon light. She glances at the camera. Lifestyle photo. Vertical. No text, no logo, no watermark.`,
    motion:
      "She lifts the iced coffee, looks into the camera, and smiles. Gentle handheld sway. Same face. No text, no logos.",
  },
  {
    id: "friends",
    still: `${FACE} She sits with one friend, a different East Asian woman with a short bob, both laughing at a small restaurant table, warm evening light, plates between them. Vertical photo. No text, no logo, no watermark.`,
    motion:
      "The two friends laugh and lean toward each other in conversation. Warm light, slow camera drift. No text, no logos.",
  },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout + stderr);
      else reject(new Error(`${path.basename(cmd)} exited ${code}\n${stderr.slice(0, 4000)}`));
    });
  });
}

function imageBuffer(url: string) {
  const match = url.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

async function stillJpeg(prompt: string, referenceUrl?: string) {
  let last = "image failed";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const result = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt,
        aspectRatio: "9:16",
        resolution: "1k",
        referenceImageUrls: referenceUrl ? [referenceUrl] : undefined,
      });
      const url = result.images?.[0]?.url;
      if (!url) throw new Error(result.error || "OpenRouter 未回傳圖片");
      const raw = imageBuffer(url) ?? Buffer.from(await (await fetch(url)).arrayBuffer());
      return sharp(raw)
        .resize(1080, 1920, { fit: "cover", position: "attention" })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      console.log("still retry", attempt, last.slice(0, 180));
      await sleep(8000);
    }
  }
  throw new Error(last);
}

async function pollVideo(statusUrl: string) {
  const deadline = Date.now() + 12 * 60_000;
  while (Date.now() < deadline) {
    const status = await fetchOpenRouterStatus(statusUrl);
    if (status.status === "completed" && status.video?.url) return status.video.url;
    if (status.status === "failed" || status.status === "nsfw") {
      throw new Error(status.error || status.status);
    }
    await sleep(8000);
  }
  throw new Error("video timed out");
}

async function clipFromStill(id: string, stillUrl: string, motion: string) {
  const file = path.join(OUT, "clips", `${id}.mp4`);
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
          startImageUrl: stillUrl,
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

function durationSeconds(log: string) {
  const match = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 5;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

async function probe(file: string) {
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  let text = "";
  try {
    text = await run(ffmpegPath, ["-hide_banner", "-i", file]);
  } catch (error) {
    text = error instanceof Error ? error.message : String(error);
  }
  return { seconds: durationSeconds(text), hasAudio: /Audio:/.test(text) };
}

async function normalize(file: string, dest: string) {
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  const info = await probe(file);
  const args = ["-y", "-i", file];
  if (!info.hasAudio) {
    args.push("-f", "lavfi", "-t", info.seconds.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
  }
  args.push(
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p",
    "-map",
    "0:v:0",
    "-map",
    info.hasAudio ? "0:a:0" : "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-shortest",
    dest,
  );
  await run(ffmpegPath, args);
  const out = await probe(dest);
  return out.seconds;
}

async function endCard() {
  const htmlPath = path.join(OUT, "end.html");
  const pngPath = path.join(OUT, "end.png");
  const mp4Path = path.join(OUT, "end.mp4");
  writeFileSync(
    htmlPath,
    `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #fffaf3; }
  .stage {
    position: relative; width: 1080px; height: 1920px; box-sizing: border-box;
    display: flex; flex-direction: column; justify-content: center; padding: 96px;
    font-family: "Avenir Next", "Helvetica Neue", sans-serif; color: #12141c;
  }
  .wash { position: absolute; border-radius: 50%; filter: blur(8px); }
  .kicker {
    position: relative; align-self: flex-start; background: #c6f24b; color: #12141c;
    font-size: 22px; font-weight: 800; letter-spacing: 0.16em; border-radius: 999px;
    padding: 12px 18px;
  }
  h1 {
    position: relative; margin: 36px 0 0; font-size: 78px; line-height: 1.02;
    letter-spacing: -0.035em; font-weight: 800; max-width: 860px;
  }
  .pill {
    position: relative; align-self: flex-start; margin-top: 40px; background: #12141c;
    color: #c6f24b; font-size: 28px; font-weight: 800; border-radius: 999px; padding: 16px 28px;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="wash" style="width:520px;height:520px;background:#c6f24b;opacity:.55;top:-80px;right:-80px;"></div>
    <div class="wash" style="width:420px;height:420px;background:#ffb15a;opacity:.45;bottom:80px;left:-100px;"></div>
    <div class="wash" style="width:280px;height:280px;background:#8fd0ff;opacity:.45;bottom:220px;right:40px;"></div>
    <div class="kicker">SCRO</div>
    <h1>use Scro to create your AI influencer now!</h1>
    <div class="pill">scro.io</div>
  </div>
</body>
</html>`,
  );
  await run(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-device-scale-factor=1",
    "--window-size=1080,1920",
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  await run(ffmpegPath, [
    "-y",
    "-loop",
    "1",
    "-t",
    "3.4",
    "-i",
    pngPath,
    "-f",
    "lavfi",
    "-t",
    "3.4",
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-vf",
    "scale=1080:1920,fps=30,format=yuv420p",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-shortest",
    mp4Path,
  ]);
  console.log("end card", pngPath);
  return mp4Path;
}

async function stitch(files: string[]) {
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  const normDir = path.join(OUT, "norm");
  mkdirSync(normDir, { recursive: true });
  const durations: number[] = [];
  const norms: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const dest = path.join(normDir, `${index}.mp4`);
    durations.push(await normalize(files[index], dest));
    norms.push(dest);
    console.log("norm", index, durations[index].toFixed(2));
  }
  const fade = 0.55;
  const filters: string[] = [];
  let video = "0:v";
  let audio = "0:a";
  let elapsed = durations[0];
  for (let index = 1; index < norms.length; index += 1) {
    const offset = Math.max(0, elapsed - fade);
    const vOut = index === norms.length - 1 ? "vout" : `vx${index}`;
    const aOut = index === norms.length - 1 ? "aout" : `ax${index}`;
    filters.push(
      `[${video}][${index}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}[${vOut}]`,
    );
    filters.push(`[${audio}][${index}:a]acrossfade=d=${fade}:c1=tri:c2=tri[${aOut}]`);
    video = vOut;
    audio = aOut;
    elapsed += durations[index] - fade;
  }
  const reel = path.join(OUT, "scro-ig-reel.mp4");
  await run(ffmpegPath, [
    "-y",
    ...norms.flatMap((file) => ["-i", file]),
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    reel,
  ]);
  copyFileSync(reel, DOWNLOAD);
  console.log("reel", reel, elapsed.toFixed(2));
}

async function pooled<T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function next() {
    const index = cursor;
    cursor += 1;
    if (index >= items.length) return;
    out[index] = await worker(items[index]);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return out;
}

async function main() {
  mkdirSync(path.join(OUT, "clips"), { recursive: true });
  mkdirSync(path.join(OUT, "stills"), { recursive: true });
  const end = await endCard();

  console.log("portrait");
  const portraitPath = path.join(OUT, "stills", "portrait.jpg");
  const portrait = existsSync(portraitPath)
    ? readFileSync(portraitPath)
    : await stillJpeg(
        `${FACE} Close portrait, soft daylight, plain warm wall, looking at the camera, calm smile. Vertical photo. No text, no logo, no watermark.`,
      );
  if (!existsSync(portraitPath)) writeFileSync(portraitPath, portrait);
  const portraitUrl = await persistBuffer(portrait, "ig-reel/portrait.jpg", "image/jpeg");
  console.log("portrait uploaded");

  const stills: Array<{ id: string; url: string; motion: string }> = [];
  for (const scene of SCENES) {
    const stillPath = path.join(OUT, "stills", `${scene.id}.jpg`);
    console.log(existsSync(stillPath) ? "reuse" : "still", scene.id);
    const jpeg = existsSync(stillPath) ? readFileSync(stillPath) : await stillJpeg(scene.still, portraitUrl);
    if (!existsSync(stillPath)) writeFileSync(stillPath, jpeg);
    const url = await persistBuffer(jpeg, `ig-reel/${scene.id}.jpg`, "image/jpeg");
    stills.push({ id: scene.id, url, motion: scene.motion });
  }

  const clipFiles = await pooled(stills, 2, (scene) => clipFromStill(scene.id, scene.url, scene.motion));
  await stitch([...clipFiles, end]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
