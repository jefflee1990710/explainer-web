/**
 * Generate left.webp, center.webp, right.webp, and center.mp4 for all 8 creation studio heroes
 * (`simple`, `explainer`, `talking-head`, `story`, `scroswap`, `teleport`, `posts`, `life`).
 *
 * Usage:
 *   npx tsx scripts/gen-tool-hero-media.ts [--only=simple,talking-head] [--ai-video]
 */
import { loadEnvConfig } from "@next/env";
import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import type { DirectorStudioKind } from "@/presentation/components/app/director-dock/director-dock-config";

loadEnvConfig(process.cwd());

const execFileAsync = promisify(execFile);

const NO_TEXT =
  "No watermark, no logo, no letters, no readable words, no numbers, no UI text chrome. Full head and hair completely visible with generous headroom.";

type ToolHeroSpec = {
  kind: DirectorStudioKind;
  leftPrompt: string;
  centerPrompt: string;
  rightPrompt: string;
  videoMotionPrompt: string;
};

const TOOL_SPECS: ToolHeroSpec[] = [
  {
    kind: "simple",
    leftPrompt: `Cinematic 16:9 first-frame keyframe photo. 24mm low-angle shot of a stylish East Asian female protagonist in an ivory trench coat standing poised at the entrance of a rain-glossed neon alley at dusk, warm amber and cyan reflections on wet pavement. ${NO_TEXT}`,
    centerPrompt: `Cinematic 16:9 2K film frame. Dynamic camera-first tracking shot of the same East Asian female protagonist in an ivory trench coat striding confidently toward the camera through glowing rain mist and bokeh neon reflections at night, expressive cinematic lighting. ${NO_TEXT}`,
    rightPrompt: `Cinematic 16:9 last-frame keyframe photo. Close-up 35mm eye-level hero shot of the same East Asian female protagonist turning toward the lens with a warm confident smile under golden streetlamp rim light and soft night bokeh. ${NO_TEXT}`,
    videoMotionPrompt:
      "Smooth 24mm tracking camera moving forward as the protagonist in the ivory trench coat walks gracefully toward the camera through the glowing neon rain street with cinematic lighting.",
  },
  {
    kind: "explainer",
    leftPrompt: `16:9 clean whiteboard doodle illustration on warm cream paper background. Hand-drawn black marker visual diagram with glowing lime #c6f24b arrows connecting a lightbulb icon, a gear workflow node, and a rising bar chart with a cheerful cartoon character pointing at the diagram. ${NO_TEXT}`,
    centerPrompt: `16:9 vibrant explainer studio showcase. A charming stylized 3D & flat-vector presenter character standing beside a glowing multi-stage visual storyboard flow diagram with colorful icon cards, floating arrows, and a rocket launch illustration on a sleek dark studio stage with lime #c6f24b accents. ${NO_TEXT}`,
    rightPrompt: `16:9 tactile paper-cutout diorama illustration. Layered textured craft paper collage showing a friendly paper-cutout character presenting three colorful 3D folded paper chart blocks under warm studio tabletop lighting with soft cast shadows. ${NO_TEXT}`,
    videoMotionPrompt:
      "The stylized explainer presenter gestures livelily toward the glowing visual diagram cards as the chart elements and rocket illustration animate smoothly with gentle camera push-in.",
  },
  {
    kind: "talking-head",
    leftPrompt: `16:9 photoreal creator studio shot. A charismatic East Asian male creator in his late 20s wearing a sage knit crewneck, sitting at a warm walnut podcast desk with a broadcast dynamic microphone on a boom arm, speaking expressively to the camera against vertical wood acoustic slats with warm golden backlight. ${NO_TEXT}`,
    centerPrompt: `16:9 photoreal 1080p talking-head shot. A charismatic East Asian female AI influencer in her late 20s with sleek shoulder-length dark hair and a tailored cream blazer, holding a compact matte-black wireless lavalier microphone near her collarbone, speaking naturally with warm eye contact in a sunlit floor-to-ceiling glass office overlooking the Hong Kong Victoria Harbour skyline. ${NO_TEXT}`,
    rightPrompt: `16:9 photoreal lifestyle vlog shot. A friendly young female creator in a cozy camel cardigan sitting by a sunlit cafe window with a ceramic latte cup on the wooden table, speaking warmly and naturally directly into the camera lens with golden morning rim light. ${NO_TEXT}`,
    videoMotionPrompt:
      "The female creator holds the compact wireless lavalier microphone steady near her collarbone and speaks naturally to the camera with lifelike lip movements, warm eye contact, subtle head nods, and gentle breathing.",
  },
  {
    kind: "story",
    leftPrompt: `16:9 cinematic golden-hour drama frame. An East Asian man and woman in their late 20s standing on a windswept rooftop terrace at sunset, exchanging an emotional unspoken look with warm amber sunlight catching their hair and city bokeh behind them. ${NO_TEXT}`,
    centerPrompt: `16:9 anamorphic 2K short film frame. A dramatic cinematic shot of a young female protagonist in a dark wool coat running through a lantern-lit Hong Kong street at night, looking back over her shoulder with intense emotion, shallow depth of field, teal and warm amber film grading. ${NO_TEXT}`,
    rightPrompt: `16:9 moody neon night dialogue frame. Two characters sitting across a rain-streaked vintage cafe window at night, illuminated by warm tungsten table lamps and cyan neon reflections outside, captured in an intimate cinematic over-the-shoulder film composition. ${NO_TEXT}`,
    videoMotionPrompt:
      "Cinematic 35mm tracking shot as the protagonist moves through the lantern-lit night street with emotional expression, wind softly moving her hair, and flickering warm amber and teal bokeh lights.",
  },
  {
    kind: "scroswap",
    leftPrompt: `16:9 studio motion capture source frame. A street dancer in a grey hoodie performing an energetic mid-air dance pose in a dark studio, surrounded by a subtle glowing lime #c6f24b motion-tracking silhouette contour around the body. ${NO_TEXT}`,
    centerPrompt: `16:9 dynamic Scro Swap split-transformation showcase. Left half shows the original dancer in motion; a glowing lime #c6f24b vertical laser scan line in the center seamlessly transforms the person on the right half into a glamorous female virtual KOL in a silver futuristic jacket performing the exact same pose and expression. ${NO_TEXT}`,
    rightPrompt: `16:9 finished character swap and relight frame. The glamorous female virtual KOL in the silver futuristic jacket completing the dynamic dance pose under dramatic golden-halo and cyan rim studio lighting with crisp photoreal detail. ${NO_TEXT}`,
    videoMotionPrompt:
      "The virtual KOL in the silver jacket performs rhythmic upper-body dance motion under shifting golden and cyan studio rim lights with smooth camera movement.",
  },
  {
    kind: "teleport",
    leftPrompt: `16:9 source video frame. A young male creator in a charcoal bomber jacket speaking to the camera inside a plain everyday apartment room, with a subtle glowing lime #c6f24b subject segmentation rim around his silhouette. ${NO_TEXT}`,
    centerPrompt: `16:9 Teleport scene relocation showcase. The exact same young male creator in the charcoal bomber jacket with identical posture and expression, seamlessly relocated into a breathtaking golden-hour luxury penthouse overlooking a glowing metropolitan skyline with matching warm sunset lighting on his face. ${NO_TEXT}`,
    rightPrompt: `16:9 relocated destination frame. The exact same young male creator in the charcoal bomber jacket speaking to the camera on a sunlit turquoise glacial mountain ridge under a crisp blue sky with natural outdoor daylight matching his skin and jacket. ${NO_TEXT}`,
    videoMotionPrompt:
      "The young male creator in the charcoal bomber jacket speaks expressively to the camera as warm sunset light shimmers across the luxury penthouse skyline behind him.",
  },
  {
    kind: "posts",
    leftPrompt: `16:9 studio brand asset board on dark charcoal ground. Two clean floating cards side by side: left card shows a photoreal female virtual model portrait; right card shows a sleek frosted-glass botanical serum bottle with fresh green leaves. ${NO_TEXT}`,
    centerPrompt: `16:9 high-fashion 2K poster studio composition. The photoreal female virtual model in an emerald silk blouse holding the frosted-glass botanical serum bottle amidst lush tropical foliage and geometric coral-and-lime #c6f24b studio light shapes, with a subtle glowing selection bounding frame around the bottle. ${NO_TEXT}`,
    rightPrompt: `16:9 in-place element edit result. The exact same female virtual model and pose, now holding a golden luxury perfume flacon in a warm sunset desert canyon studio set after one-click SAM-3 element replacement. ${NO_TEXT}`,
    videoMotionPrompt:
      "Subtle commercial camera push-in on the female model holding the botanical serum bottle as studio rim light glides across the glass bottle and tropical foliage.",
  },
  {
    kind: "life",
    leftPrompt: `16:9 candid Instagram lifestyle photo. A stylish East Asian female AI influencer in her mid-20s with a effortless low bun and linen shirt, smiling naturally while holding an iced matcha latte at a sunlit Parisian-style sidewalk cafe table. ${NO_TEXT}`,
    centerPrompt: `16:9 golden-hour lifestyle travel shot. The same East Asian female AI influencer in a breezy cream sundress turning back toward the camera with a radiant candid smile on a sunlit coastal boardwalk overlooking sparkling ocean waves at sunset. ${NO_TEXT}`,
    rightPrompt: `16:9 street fashion OOTD photo. The same East Asian female AI influencer wearing an oversized charcoal blazer and sunglasses, walking confidently past a minimalist architectural concrete gallery wall in soft afternoon daylight. ${NO_TEXT}`,
    videoMotionPrompt:
      "Handheld lifestyle camera movement as the female AI influencer on the sunlit coastal boardwalk turns toward the lens with a warm candid smile, ocean breeze gently moving her hair in golden sunset light.",
  },
];

async function fileExistsNonEmpty(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 1000;
  } catch {
    return false;
  }
}

async function generateWebpImage(prompt: string, outPath: string, force: boolean) {
  if (!force && (await fileExistsNonEmpty(outPath))) {
    console.log("  [skip existing image]", path.relative(process.cwd(), outPath));
    return;
  }
  const { submitOpenRouterImage, OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL } = await import(
    "@/service/openrouter/generate"
  );
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const submitted = await submitOpenRouterImage({
        model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
        prompt,
        aspectRatio: "16:9",
        resolution: "1k",
      });
      const url = submitted.images?.[0]?.url;
      if (!url || submitted.status === "nsfw") {
        throw new Error(submitted.error || "No image returned");
      }
      const bytes = url.startsWith("data:")
        ? Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
        : Buffer.from(await (await fetch(url)).arrayBuffer());
      await mkdir(path.dirname(outPath), { recursive: true });
      const webp = await sharp(bytes)
        .resize({ width: 960, height: 540, fit: "cover" })
        .webp({ quality: 86 })
        .toBuffer();
      await writeFile(outPath, webp);
      console.log(
        "  [wrote image]",
        path.relative(process.cwd(), outPath),
        `${(webp.length / 1024).toFixed(1)} KB`,
      );
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `  [retry ${attempt}/3] ${path.basename(outPath)}:`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw lastErr;
}

/**
 * Build a smooth 6-second 30fps looping MP4 video from center.webp -> right.webp -> left.webp -> center.webp
 * with subtle camera push/pan and smooth crossfades so the middle card plays immediately in all browsers.
 */
async function buildFfmpegShowcaseVideo(
  dir: string,
  outMp4: string,
  force: boolean,
) {
  if (!force && (await fileExistsNonEmpty(outMp4))) {
    console.log("  [skip existing video]", path.relative(process.cwd(), outMp4));
    return;
  }
  const centerImg = path.join(dir, "center.webp");
  const leftImg = path.join(dir, "left.webp");
  const rightImg = path.join(dir, "right.webp");

  // 3 segments of 2.4s each with 0.4s xfade transitions -> ~6.4s smooth loop starting on centerImg
  const filterComplex = [
    "[0:v]scale=1280:720,zoompan=z='min(zoom+0.0018,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=72:s=640x360:fps=30,format=yuv420p[v0]",
    "[1:v]scale=1280:720,zoompan=z='1.12-0.0015*on':x='iw/2-(iw/zoom/2)+on*0.6':y='ih/2-(ih/zoom/2)':d=72:s=640x360:fps=30,format=yuv420p[v1]",
    "[2:v]scale=1280:720,zoompan=z='min(zoom+0.0018,1.12)':x='iw/2-(iw/zoom/2)-on*0.6':y='ih/2-(ih/zoom/2)':d=72:s=640x360:fps=30,format=yuv420p[v2]",
    "[v0][v1]xfade=transition=fade:duration=0.45:offset=1.95[vx1]",
    "[vx1][v2]xfade=transition=fade:duration=0.45:offset=3.9[vout]",
  ].join(";");

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    centerImg,
    "-i",
    leftImg,
    "-i",
    rightImg,
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    outMp4,
  ]);
  const info = await stat(outMp4);
  console.log(
    "  [wrote video]",
    path.relative(process.cwd(), outMp4),
    `${(info.size / 1024).toFixed(1)} KB`,
  );
}

/**
 * Optional: Submit and poll native AI video via OpenRouter Wan 3.0 from center.webp -> right.webp
 * when `--ai-video` flag is passed.
 */
async function tryGenerateAiVideo(spec: ToolHeroSpec, dir: string, outMp4: string) {
  const {
    submitOpenRouterClipVideo,
    fetchOpenRouterStatus,
    OPENROUTER_WAN_3_VIDEO_MODEL,
    openRouterAuthHeaders,
  } = await import("@/service/openrouter/generate");
  const { readFile } = await import("node:fs/promises");

  const centerBytes = await readFile(path.join(dir, "center.webp"));
  const startDataUrl = `data:image/webp;base64,${centerBytes.toString("base64")}`;

  console.log(`  [submitting AI video] ${spec.kind}...`);
  const sub = await submitOpenRouterClipVideo(
    {
      model: OPENROUTER_WAN_3_VIDEO_MODEL,
      prompt: spec.videoMotionPrompt,
      aspectRatio: "16:9",
      durationSeconds: 5,
      startImageUrl: startDataUrl,
    },
    { callbackUrl: null },
  );
  if (!sub.status_url) {
    throw new Error(`No status_url for ${spec.kind}`);
  }
  const deadline = Date.now() + 6 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 8000));
    const polled = await fetchOpenRouterStatus(sub.status_url);
    if (polled.status === "completed" && polled.video?.url) {
      const res = await fetch(polled.video.url, {
        headers: openRouterAuthHeaders(polled.video.url),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const rawMp4 = path.join(dir, "center-raw.mp4");
      await writeFile(rawMp4, Buffer.from(await res.arrayBuffer()));
      // Strip audio and normalize to 640x360 faststart MP4 for instant hero preview
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        rawMp4,
        "-vf",
        "scale=640:360:force_original_aspect_ratio=increase,crop=640:360",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        outMp4,
      ]);
      const { unlink } = await import("node:fs/promises");
      await unlink(rawMp4).catch(() => {});
      console.log(`  [wrote AI video] ${path.relative(process.cwd(), outMp4)}`);
      return;
    }
    if (polled.status === "failed" || polled.status === "nsfw") {
      throw new Error(polled.error || `AI video ${polled.status}`);
    }
  }
  throw new Error(`AI video timed out for ${spec.kind}`);
}

async function main() {
  const onlyArg = process.argv
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length)
    .split(",")
    .filter(Boolean);
  const force = process.argv.includes("--force");
  const useAiVideo = process.argv.includes("--ai-video");

  const specs = TOOL_SPECS.filter(
    (s) => !onlyArg || onlyArg.includes(s.kind),
  );

  for (const spec of specs) {
    console.log(`\n=== Generating hero media for [${spec.kind}] ===`);
    const dir = path.join(process.cwd(), "public/hero/tools", spec.kind);
    await mkdir(dir, { recursive: true });

    await Promise.all([
      generateWebpImage(spec.leftPrompt, path.join(dir, "left.webp"), force),
      generateWebpImage(spec.centerPrompt, path.join(dir, "center.webp"), force),
      generateWebpImage(spec.rightPrompt, path.join(dir, "right.webp"), force),
    ]);

    const outMp4 = path.join(dir, "center.mp4");
    await buildFfmpegShowcaseVideo(dir, outMp4, force);

    if (useAiVideo) {
      try {
        await tryGenerateAiVideo(spec, dir, outMp4);
      } catch (err) {
        console.warn(
          `  [fallback to FFmpeg video for ${spec.kind}]:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  console.log("\nAll 8 tool hero media packages ready!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
