/**
 * Generate one English Instagram portrait (1080×1350) per feature.
 * The photo is a new OpenRouter Seedream still. English type stays in the
 * layout so the words posted on Instagram are exact.
 *
 * Usage: npx tsx scripts/gen-ig-posts.ts [--only=ai,promo]
 *        npx tsx scripts/gen-ig-posts.ts --restyle   # recolor and add points, keep the photos
 */
import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AspectRatio } from "@/model/project";

loadEnvConfig(process.cwd());

const ROOT = process.cwd();
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DRAFT = path.join(ROOT, "public/_ig-render");
const DOWNLOADS = "/Users/jefflee/Downloads";
const WIDTH = 1080;
const HEIGHT = 1350;

const NO_TEXT = "No watermark, no logo, no letters, no readable words, no numbers.";

type Post = {
  id: string;
  file: string;
  download: string;
  kicker: string;
  title: string;
  points: string[];
  /** Three wash colors on the light card: lime, warm, cool. */
  wash: [string, string, string];
  prompt: string;
  aspectRatio: AspectRatio;
};

const POSTS: Post[] = [
  {
    id: "ai",
    file: "public/landing/ai-influencer/ig-post.jpg",
    download: "scro-ig-ai-influencer.jpg",
    kicker: "AI Influencer",
    title: "A face is the shell. The soul is what you know.",
    points: ["One locked face", "Your knowledge, their voice", "A feed people recognize"],
    wash: ["#c6f24b", "#ffb15a", "#8fd0ff"],
    aspectRatio: "16:9",
    prompt: `16:9 editorial photo. New East Asian woman, late 20s, long straight black hair, cream blazer, rainy Hong Kong street at night, warm shop bokeh, calm smile at camera. Full head, generous headroom, upper body. ${NO_TEXT}`,
  },
  {
    id: "promo",
    file: "public/landing/product-promo/ig-post.jpg",
    download: "scro-ig-product-promo.jpg",
    kicker: "Product promo",
    title: "A scene a crew would not book.",
    points: ["The real product, unchanged", "A host people already know", "Scenes a crew would not book"],
    wash: ["#ffd23a", "#ff8a6a", "#c6f24b"],
    aspectRatio: "16:9",
    prompt: `16:9 commercial photo. New Southeast Asian woman, late 20s, sleek bob, black silk shirt, holding a frosted glass serum bottle toward camera in a dark studio. Warm key light, thin lime rim light. Full head, generous headroom. ${NO_TEXT}`,
  },
  {
    id: "tool",
    file: "public/landing/right-tool/ig-post.jpg",
    download: "scro-ig-right-tool.jpg",
    kicker: "The right tool",
    title: "One studio for the whole film.",
    points: ["Character, script, and cut", "One studio, no second app", "Change a line, see the film"],
    wash: ["#7ec8ff", "#c6f24b", "#ffe07a"],
    aspectRatio: "16:9",
    prompt: `16:9 photo. New East Asian man, early 30s, short black hair, olive overshirt, dark desk. Three glowing rounded storyboard cards beside a laptop, thin lime edge light. Looking at camera. Full head, generous headroom. ${NO_TEXT}`,
  },
  {
    id: "talk",
    file: "public/landing/talking-head/ig-post.jpg",
    download: "scro-ig-talking-head.jpg",
    kicker: "Talking head",
    title: "On camera, without living on camera.",
    points: ["A host in a real room", "You write the words", "You keep the afternoon"],
    wash: ["#d7b6ff", "#ffc48a", "#c6f24b"],
    aspectRatio: "16:9",
    prompt: `16:9 photo. New East Asian woman, late 20s, wavy black hair, navy knit, beige sofa in a bright living room, speaking toward camera. Soft window light. Full head, generous headroom. ${NO_TEXT}`,
  },
  {
    id: "canto",
    file: "public/landing/cantonese/ig-post.jpg",
    download: "scro-ig-cantonese.jpg",
    kicker: "Cantonese",
    title: "Hong Kong speech. Not a translation.",
    points: ["Local words, a local place", "The same face every time", "Speech, not a translation"],
    wash: ["#ffc14d", "#ff8d7a", "#d6ff6a"],
    aspectRatio: "16:9",
    prompt: `16:9 photo. New Hong Kong woman, late 20s, low ponytail, white tee and apron, cha chaan teng booth, glass of milk tea, talking to camera. Warm light. Full head, generous headroom. No readable signs. ${NO_TEXT}`,
  },
  {
    id: "explain",
    file: "public/landing/explainer/ig-post.jpg",
    download: "scro-ig-explainer.jpg",
    kicker: "Explainer",
    title: "Say the idea once, and show it.",
    points: ["One claim", "One picture", "One host"],
    wash: ["#8ad7ff", "#c6f24b", "#ffe07a"],
    aspectRatio: "16:9",
    prompt: `16:9 photo. New East Asian man, early 30s, white shirt, beside a whiteboard with a blank three-shape funnel and arrows, no letters. Bright room, looking at camera. Full head, generous headroom. ${NO_TEXT}`,
  },
];

function page(post: Post) {
  const [a, b, c] = post.wash;
  const points = post.points.map((point) => `<li>${point}</li>`).join("");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    position: relative;
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    color: #12141c;
    background: #fffaf3;
    padding: 56px;
    display: flex;
    flex-direction: column;
  }
  .wash {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(540px 420px at 0% 0%, ${a} 0%, transparent 68%),
      radial-gradient(480px 380px at 100% 8%, ${b} 0%, transparent 70%),
      radial-gradient(620px 460px at 78% 100%, ${c} 0%, transparent 68%);
  }
  .brand, .kicker, h1, ul, .frame, .cta { position: relative; z-index: 1; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand img { width: 52px; height: 52px; border-radius: 14px; }
  .brand span { font-size: 30px; font-weight: 700; letter-spacing: -0.03em; }
  .kicker {
    margin-top: 28px;
    align-self: flex-start;
    background: #c6f24b;
    color: #12141c;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin-top: 20px;
    font-size: 56px;
    line-height: 1.08;
    letter-spacing: -0.035em;
    font-weight: 700;
    max-width: 940px;
  }
  ul { margin-top: 18px; list-style: none; }
  li {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 10px;
    font-size: 28px;
    line-height: 1.25;
    font-weight: 600;
  }
  li::before {
    content: "";
    width: 16px;
    height: 16px;
    flex: none;
    border-radius: 999px;
    background: #c6f24b;
    box-shadow: 0 0 0 4px rgba(18, 20, 28, 0.12);
  }
  .frame {
    margin-top: 28px;
    flex: 1;
    min-height: 0;
    border-radius: 28px;
    overflow: hidden;
    background: white;
    box-shadow: 0 18px 40px rgba(18, 20, 28, 0.12);
  }
  .frame img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
  .cta {
    margin-top: 24px;
    align-self: flex-start;
    background: #12141c;
    color: #c6f24b;
    border-radius: 999px;
    padding: 14px 22px;
    font-size: 22px;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="wash"></div>
  <div class="brand"><img src="/logo-mark.png" alt="" /><span>Scro</span></div>
  <p class="kicker">${post.kicker}</p>
  <h1>${post.title}</h1>
  <ul>${points}</ul>
  <div class="frame"><img src="/_ig-render/${post.id}.jpg" alt="" /></div>
  <p class="cta">scro.io</p>
</body>
</html>`;
}

function shot(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${WIDTH},${HEIGHT}`,
        `--screenshot=${dest}`,
        url,
      ],
      { stdio: "inherit" },
    );
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`chrome timeout ${url}`));
    }, 45_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`chrome ${code} ${url}`));
    });
  });
}

async function generateScene(post: Post) {
  const { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } = await import(
    "@/service/openrouter/generate"
  );
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const submitted = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt: post.prompt,
        aspectRatio: post.aspectRatio,
        resolution: "1k",
      });
      const url = submitted.images?.[0]?.url;
      if (!url || submitted.status === "nsfw") {
        throw new Error(submitted.error || "沒有圖片");
      }
      const bytes = url.startsWith("data:")
        ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
        : Buffer.from(await (await fetch(url)).arrayBuffer());
      const jpg = await sharp(bytes)
        .resize({ width: 1440, withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
      const scene = path.join(DRAFT, `${post.id}.jpg`);
      await writeFile(scene, jpg);
      console.log("scene", post.id, jpg.length);
      return;
    } catch (err) {
      lastError = err;
      const cause = err instanceof Error && "cause" in err ? (err as { cause?: unknown }).cause : undefined;
      console.warn(`retry ${attempt}/3 for ${post.id}:`, err instanceof Error ? err.message : err, cause ?? "");
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastError;
}

async function renderCard(post: Post) {
  const htmlPath = path.join(DRAFT, `${post.id}.html`);
  await writeFile(htmlPath, page(post));
  const png = path.join(DRAFT, `${post.id}.png`);
  await shot(`http://localhost:3000/_ig-render/${post.id}.html`, png);
  const jpg = await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const meta = await sharp(jpg).metadata();
  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    throw new Error(`${post.id} is ${meta.width}x${meta.height}`);
  }
  const dest = path.join(ROOT, post.file);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, jpg);
  await copyFile(dest, path.join(DOWNLOADS, post.download));
  console.log("wrote", post.file, meta.width, meta.height, jpg.length);
}

// Pull the existing generated photo out of the current card so a restyle does not call the model again.
const PHOTO_CROP = { left: 72, top: 478, width: 936, height: 712 };

async function reuseScene(post: Post) {
  const src = path.join(ROOT, post.file);
  const jpg = await sharp(src).extract(PHOTO_CROP).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  await writeFile(path.join(DRAFT, `${post.id}.jpg`), jpg);
  console.log("reused", post.id, jpg.length);
}

async function main() {
  const only = process.argv
    .find((argument) => argument.startsWith("--only="))
    ?.slice(7)
    .split(",")
    .filter(Boolean);
  const restyle = process.argv.includes("--restyle");
  const posts = POSTS.filter((post) => !only || only.includes(post.id));
  await mkdir(DRAFT, { recursive: true });
  // Crop every current card before any rewrite, so a failed render can be retried from the same photos.
  if (restyle) {
    for (const post of posts) await reuseScene(post);
  }
  const failures: string[] = [];
  for (const post of posts) {
    try {
      if (!restyle) await generateScene(post);
      await renderCard(post);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("fail", post.id, message);
      failures.push(`${post.id}: ${message}`);
    }
  }
  await rm(DRAFT, { recursive: true, force: true });
  if (failures.length) {
    console.error("Failures:\n" + failures.join("\n"));
    process.exit(1);
  }
}

main();
