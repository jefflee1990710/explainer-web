import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

loadEnvConfig(process.cwd());

const ROOT = "/tmp/scro-ig-reel";
const AD = path.join(ROOT, "ad");
const DOWNLOAD = "/Users/jefflee/Downloads/scro-ig-ad.mp4";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const HOLD = 0;
const FADE = 0.72;
const END_SECONDS = 5.6;

const SCENES = [
  {
    id: "talking-head",
    file: path.join(ROOT, "clips", "watch-talk.mp4"),
    kicker: "NEXT-GENERATION",
    title: "A video tool you must know",
    titleSize: 52,
  },
  {
    id: "explainer",
    file: path.join(ROOT, "clips", "explainer.mp4"),
    kicker: "EXPLAINER",
    title: "Explain any idea",
    titleSize: 72,
  },
  {
    id: "ootd",
    file: path.join(ROOT, "clips", "ootd-swap.mp4"),
    kicker: "SAME MOVE",
    title: "Try every look",
    titleSize: 68,
  },
  {
    id: "daily",
    file: path.join(ROOT, "clips", "daily.mp4"),
    kicker: "DAILY POST",
    title: "Post the day",
    titleSize: 72,
  },
  {
    id: "friends",
    file: path.join(ROOT, "clips", "friends.mp4"),
    kicker: "WITH FRIENDS",
    title: "A life people follow",
    titleSize: 64,
  },
] as const;

const NARRATION = [
  "This is a next-generation video tool you must know.",
  "We watch her talk, no camera in her face, no crew and no reshoot. She explains any idea, clear and simple.",
  "Then one pose, and the clothes keep changing, so many looks to try, same face.",
  "She posts the afternoon with an iced coffee, a day that feels real, and laughs with a friend, a life people follow. Use Scro to create your AI influencer now.",
].join(" ");

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
      else reject(new Error(`${path.basename(cmd)} exited ${code}\n${stderr.slice(-2500)}`));
    });
  });
}

function ffmpegBin() {
  if (!ffmpegPath) throw new Error("找不到 ffmpeg");
  return ffmpegPath;
}

function clipSeconds(log: string) {
  const match = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error("讀不到影片長度");
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

async function probeSeconds(file: string) {
  let text = "";
  try {
    text = await run(ffmpegBin(), ["-hide_banner", "-i", file]);
  } catch (error) {
    text = error instanceof Error ? error.message : String(error);
  }
  return clipSeconds(text);
}

function plateSvg(kicker: string, title: string, titleSize: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <text x="88" y="1288" fill="#c6f24b" font-family="Arial" font-weight="700" font-size="28" letter-spacing="5">${kicker}</text>
  <text x="88" y="1376" fill="#ffffff" font-family="Arial Black, Arial" font-weight="900" font-size="${titleSize}">${title}</text>
</svg>`;
}

function scrimSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12141c" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#12141c" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#12141c" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect x="0" y="1080" width="1080" height="840" fill="url(#g)"/>
  <rect x="72" y="198" width="156" height="64" rx="32" fill="#c6f24b"/>
  <text x="104" y="240" fill="#12141c" font-family="Arial" font-weight="700" font-size="28" letter-spacing="3">SCRO</text>
</svg>`;
}

async function renderPlate(file: string, svg: string) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(file, png);
}

async function speak(file: string, text: string) {
  if (existsSync(file)) return;
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("尚未設定 ELEVENLABS_API_KEY");
  let last = "tts failed";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.8,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(90_000),
        },
      );
      if (!response.ok) throw new Error(`tts ${response.status}`);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      console.log("tts retry", attempt, last.slice(0, 160));
      await sleep(1500 * attempt);
    }
  }
  throw new Error(last);
}

async function composeMusic(file: string) {
  if (existsSync(file)) return;
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("尚未設定 ELEVENLABS_API_KEY");
  const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt:
        "Warm cinematic film underscore for a realistic lifestyle commercial. Soft piano, intimate strings, light brush percussion, gentle forward motion, no vocals, no lyrics.",
      music_length_ms: 32000,
      model_id: "music_v1",
      force_instrumental: true,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`music ${response.status} ${detail.slice(0, 180)}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 10_000) throw new Error("music too small");
  writeFileSync(file, audio);
}

async function normalizeClip(source: string, dest: string) {
  if (existsSync(dest)) return probeSeconds(dest);
  const seconds = (await probeSeconds(source)) + HOLD;
  await run(ffmpegBin(), [
    "-y",
    "-i",
    source,
    "-f",
    "lavfi",
    "-t",
    seconds.toFixed(3),
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,eq=contrast=1.05:brightness=0.015:saturation=0.88:gamma=1.05,colorbalance=rs=-0.04:bs=0.06:rh=0.06:gh=0.02:bh=-0.05,vignette=PI/5,noise=alls=4:allf=t,format=yuv420p",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-t",
    seconds.toFixed(3),
    dest,
  ]);
  return probeSeconds(dest);
}

async function endCard() {
  const htmlPath = path.join(AD, "end.html");
  const pngPath = path.join(AD, "end.png");
  const mp4Path = path.join(AD, "end.mp4");
  if (existsSync(mp4Path) && existsSync(path.join(AD, "end.png"))) return mp4Path;
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
    display: flex; flex-direction: column; justify-content: flex-end; padding: 120px 88px 280px;
    font-family: Arial, Helvetica, sans-serif; color: #12141c;
  }
  .wash { position: absolute; border-radius: 50%; filter: blur(10px); }
  .kicker {
    position: relative; align-self: flex-start; background: #c6f24b; color: #12141c;
    font-size: 26px; font-weight: 800; letter-spacing: 0.18em; border-radius: 999px;
    padding: 14px 22px;
  }
  .formats {
    position: relative; margin: 36px 0 0; font-size: 32px; font-weight: 700; letter-spacing: -0.02em;
    color: #12141c; opacity: 0.72;
  }
  h1 {
    position: relative; margin: 28px 0 0; font-size: 84px; line-height: 0.98;
    letter-spacing: -0.04em; font-weight: 800; max-width: 900px;
  }
  .pill {
    position: relative; align-self: flex-start; margin-top: 40px; background: #12141c;
    color: #c6f24b; font-size: 30px; font-weight: 800; border-radius: 999px; padding: 16px 28px;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="wash" style="width:560px;height:560px;background:#c6f24b;opacity:.62;top:-120px;right:-120px;"></div>
    <div class="wash" style="width:440px;height:440px;background:#ffb15a;opacity:.4;bottom:180px;left:-140px;"></div>
    <div class="wash" style="width:300px;height:300px;background:#8fd0ff;opacity:.42;top:420px;left:640px;"></div>
    <div class="kicker">SCRO</div>
    <div class="formats">Talking heads. Explainers. Outfits. Daily life.</div>
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
  await run(ffmpegBin(), [
    "-y",
    "-loop",
    "1",
    "-t",
    END_SECONDS.toFixed(3),
    "-i",
    pngPath,
    "-f",
    "lavfi",
    "-t",
    END_SECONDS.toFixed(3),
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-vf",
    "scale=1080:1920,zoompan=z='min(1.0+0.035*on/168,1.035)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-shortest",
    mp4Path,
  ]);
  return mp4Path;
}

async function stitch(files: string[], durations: number[]) {
  const filters: string[] = [];
  let video = "0:v";
  let audio = "0:a";
  let elapsed = durations[0];
  for (let index = 1; index < files.length; index += 1) {
    const offset = Math.max(0, elapsed - FADE);
    const vOut = index === files.length - 1 ? "vout" : `vx${index}`;
    const aOut = index === files.length - 1 ? "aout" : `ax${index}`;
    filters.push(
      `[${video}][${index}:v]xfade=transition=fadewhite:duration=${FADE}:offset=${offset.toFixed(3)}[${vOut}]`,
    );
    filters.push(`[${audio}][${index}:a]acrossfade=d=${FADE}:c1=tri:c2=tri[${aOut}]`);
    video = vOut;
    audio = aOut;
    elapsed += durations[index] - FADE;
  }
  const reel = path.join(AD, "picture.mp4");
  await run(ffmpegBin(), [
    "-y",
    ...files.flatMap((file) => ["-i", file]),
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    reel,
  ]);
  return { reel, total: elapsed };
}

function captionWindow(index: number, starts: number[], lengths: number[]) {
  const start = index === 0 ? 0.28 : starts[index] + 0.42;
  const end = starts[index] + lengths[index] - FADE - 0.12;
  return { start, end: Math.max(start + 1.2, end) };
}

async function finish(picture: string, starts: number[], lengths: number[], total: number) {
  const scrim = path.join(AD, "scrim.png");
  await renderPlate(scrim, scrimSvg());
  const plates: string[] = [];
  for (const scene of SCENES) {
    const file = path.join(AD, `${scene.id}.png`);
    await renderPlate(file, plateSvg(scene.kicker, scene.title, scene.titleSize));
    plates.push(file);
  }

  const narrationFile = path.join(AD, "vo-narration.mp3");
  console.log("speak narration");
  await speak(narrationFile, NARRATION);
  const voiceTarget = Math.max(8, total - 0.55);
  const voiceSeconds = await probeSeconds(narrationFile);
  const tempo = Math.min(1.1, Math.max(0.92, voiceSeconds / voiceTarget));
  const fittedVoice = path.join(AD, "vo-fitted.mp3");
  await run(ffmpegBin(), [
    "-y",
    "-i",
    narrationFile,
    "-filter:a",
    `atempo=${tempo.toFixed(3)}`,
    fittedVoice,
  ]);
  console.log("vo", voiceSeconds.toFixed(2), "tempo", tempo.toFixed(3), "target", voiceTarget.toFixed(2));

  const endStart = starts[SCENES.length];
  const filters: string[] = [];
  const inputs: string[] = ["-i", picture, "-loop", "1", "-framerate", "30", "-t", total.toFixed(3), "-i", scrim];
  filters.push(
    `[1:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1,fade=t=out:st=${Math.max(0, endStart - 0.7).toFixed(3)}:d=0.45:alpha=1[scrim]`,
  );
  let base = "0:v";
  filters.push(`[${base}][scrim]overlay=0:0:eof_action=pass:format=auto[b0]`);
  base = "b0";

  SCENES.forEach((scene, index) => {
    const window = captionWindow(index, starts, lengths);
    const duration = Math.max(0.8, window.end - window.start);
    inputs.push("-loop", "1", "-framerate", "30", "-t", duration.toFixed(3), "-i", plates[index]);
    const inputIndex = index + 2;
    filters.push(
      `[${inputIndex}:v]format=rgba,fade=t=in:st=0:d=0.28:alpha=1,fade=t=out:st=${Math.max(0.3, duration - 0.36).toFixed(3)}:d=0.32:alpha=1,setpts=PTS+${window.start.toFixed(3)}/TB[cap${index}]`,
    );
    const out = index === SCENES.length - 1 ? "vout" : `b${index + 1}`;
    filters.push(`[${base}][cap${index}]overlay=0:0:eof_action=pass:format=auto[${out}]`);
    base = out;
  });

  const musicFile = path.join(AD, "music.mp3");
  inputs.push("-i", musicFile, "-i", fittedVoice);
  const musicIndex = 2 + SCENES.length;
  const voiceIndex = musicIndex + 1;
  const musicOut = Math.max(1, total - 1.3).toFixed(3);
  filters.push(
    `[0:a]volume=0[sil]`,
    `[${musicIndex}:a]aresample=48000,apad,atrim=0:${total.toFixed(3)},afade=t=in:st=0:d=0.5,afade=t=out:st=${musicOut}:d=1.15,volume=0.42[mus]`,
    `[${voiceIndex}:a]aresample=48000,adelay=180|180,volume=1.35,asplit=2[voice][side]`,
    `[mus][side]sidechaincompress=threshold=0.02:ratio=8:attack=12:release=280[duck]`,
    `[sil][voice][duck]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.97[aout]`,
  );

  const reel = path.join(AD, "scro-ig-ad.mp4");
  await run(ffmpegBin(), [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    "-t",
    total.toFixed(3),
    reel,
  ]);
  copyFileSync(reel, DOWNLOAD);
  console.log("ad", reel, total.toFixed(2));
}

async function main() {
  mkdirSync(AD, { recursive: true });
  const norms: string[] = [];
  const durations: number[] = [];
  for (const scene of SCENES) {
    const dest = path.join(AD, `film-${scene.id}.mp4`);
    console.log("norm", scene.id);
    durations.push(await normalizeClip(scene.file, dest));
    norms.push(dest);
  }
  console.log("end card");
  const end = await endCard();
  const endLength = await probeSeconds(end);
  const files = [...norms, end];
  const allDurations = [...durations, endLength];
  const { reel, total } = await stitch(files, allDurations);
  const starts: number[] = [0];
  let elapsed = allDurations[0];
  for (let index = 1; index < allDurations.length; index += 1) {
    starts.push(elapsed - FADE);
    elapsed += allDurations[index] - FADE;
  }
  console.log("starts", starts.map((value) => value.toFixed(2)).join(","), "picture", reel);
  console.log("music");
  await composeMusic(path.join(AD, "music.mp3"));
  await finish(reel, starts, durations, total);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
