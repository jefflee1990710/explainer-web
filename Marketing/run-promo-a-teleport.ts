import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { ObjectId } from "mongodb";
import sharp from "sharp";
import { charactersCollection, teleportJobsCollection, usersCollection } from "../src/dao";
import type { TeleportJob } from "../src/model/teleport-job";
import { persistBuffer } from "../src/service/higgsfield/persist";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  openRouterAuthHeaders,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "../src/service/openrouter/generate";
import { runFfmpeg } from "../src/service/reel/concat";
import {
  advanceTeleportJobs,
  runTeleportJobInBackground,
} from "../src/service/teleport/pipeline";
import {
  sendMarketingPhotoToTelegram,
  sendMarketingTextToTelegram,
  sendMarketingVideoToTelegram,
} from "./telegram";

const MARKETING_DIR = join(process.cwd(), "Marketing");
const SCRO_CHARACTER_ID = "6ae0d86cf75348b44a26322c";

async function imageUrlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    return Buffer.from(url.split(",")[1] || "", "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function pollOpenRouterVideoUntilDone(statusUrl: string): Promise<string> {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const polled = await fetchOpenRouterStatus(statusUrl);
    console.log(`[Promo-A Source Poll ${i + 1}] status=${polled.status}`);
    if (polled.status === "completed" && polled.video?.url) {
      return polled.video.url;
    }
    if (polled.status === "failed" || polled.status === "nsfw") {
      throw new Error(polled.error || "OpenRouter source video failed");
    }
  }
  throw new Error("Timed out waiting for OpenRouter source video");
}

async function waitForTeleportJob(jobId: ObjectId, label: string): Promise<TeleportJob & { _id: ObjectId }> {
  const col = await teleportJobsCollection();
  await runTeleportJobInBackground(jobId);

  for (let i = 0; i < 90; i++) {
    const doc = (await col.findOne({ _id: jobId })) as (TeleportJob & { _id: ObjectId }) | null;
    if (!doc) throw new Error(`Teleport job ${label} disappeared`);
    console.log(`[Teleport ${label} Poll ${i + 1}] status=${doc.status} out=${doc.outputVideoUrl || ""}`);
    if (doc.status === "completed" && doc.outputVideoUrl) {
      return doc;
    }
    if (doc.status === "failed") {
      throw new Error(`Teleport ${label} failed: ${doc.error}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
    await advanceTeleportJobs(doc.clerkUserId);
  }
  throw new Error(`Timed out waiting for Teleport job ${label}`);
}

/** Create a transparent 1080x1920 PNG overlay with top hook banner and bottom location badge. */
async function createPromoOverlayPng(input: {
  topBadge: string;
  topTitleLine1: string;
  topTitleLine2: string;
  bottomPill: string;
  accentColor: string;
}): Promise<Buffer> {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <!-- Top Hook Card -->
    <rect x="64" y="96" width="952" height="236" rx="34" fill="#12141c" fill-opacity="0.88" stroke="${input.accentColor}" stroke-width="5"/>
    <rect x="96" y="124" width="340" height="46" rx="23" fill="${input.accentColor}"/>
    <text x="266" y="155" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="25" fill="#12141c">${esc(input.topBadge)}</text>
    <text x="540" y="228" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" fill="#ffffff">${esc(input.topTitleLine1)}</text>
    <text x="540" y="288" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="38" fill="${input.accentColor}">${esc(input.topTitleLine2)}</text>

    <!-- Bottom Location + CTA Pill -->
    <rect x="110" y="1640" width="860" height="130" rx="65" fill="#12141c" fill-opacity="0.9" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>
    <text x="540" y="1700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#ffffff">${esc(input.bottomPill)}</text>
    <text x="540" y="1744" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="24" fill="#d4ff33">Try AI Background Teleport Free → scro.io</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  console.log("=== Starting Promo A: Scro Teleport Background Swap (English) ===");

  const charCol = await charactersCollection();
  const scroChar = await charCol.findOne({ _id: new ObjectId(SCRO_CHARACTER_ID) });
  if (!scroChar) {
    throw new Error("Could not find Scro character in MongoDB");
  }
  const userCol = await usersCollection();
  const owner = await userCol.findOne({ clerkUserId: scroChar.clerkUserId });
  if (!owner) {
    throw new Error("Could not find owner user for Scro character");
  }

  const completedVersions = (scroChar.versions || []).filter((v) => v.status === "completed");
  const latestVer = completedVersions[completedVersions.length - 1]!;
  const scroRefs = [latestVer.portraitUrl, latestVer.profileUrl].filter(
    (u): u is string => Boolean(u),
  );
  console.log("Loaded Scro references:", scroRefs);

  // Step 1: Generate "Before" start & end keyframes of Scro in a messy, cramped bedroom via OpenRouter Seedream 5.0 Pro
  console.log("1. Generating Scro messy-bedroom Before start & end frames via Seedream 5.0 Pro...");
  const startStillPrompt = [
    "Photorealistic 9:16 vertical creator reel frame of the exact young woman from the attached character reference images (Scro), keeping her exact face geometry, eyes, nose, lips, natural porous skin texture, and dark tailored blazer over a crisp white shirt.",
    "Framing: waist-up medium shot facing the camera at eye level.",
    "Pose: she looks directly into the lens with a confident, slightly playful expression, right hand raised near shoulder height ready to snap her fingers.",
    "Background: a cramped, cluttered everyday apartment bedroom with laundry piled on an unmade bed, tangled cables on a small desk, cardboard boxes, and flat overhead fluorescent room lighting.",
  ].join(" ");

  const endStillPrompt = [
    "Photorealistic 9:16 vertical creator reel frame of the exact same young woman from the attached character reference images (Scro) in the same dark tailored blazer over a white shirt.",
    "Framing: locked waist-up medium shot in the exact same cramped, cluttered apartment bedroom.",
    "Pose: she just finished snapping her fingers and gestures smoothly with her hand while speaking warmly and confidently to the camera.",
  ].join(" ");

  const [startImgRes, endImgRes] = await Promise.all([
    submitOpenRouterImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: startStillPrompt,
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: scroRefs,
    }),
    submitOpenRouterImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: endStillPrompt,
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: scroRefs,
    }),
  ]);

  const startBuf = await imageUrlToBuffer(startImgRes.images![0]!.url!);
  const endBuf = await imageUrlToBuffer(endImgRes.images![0]!.url!);

  const ts = Date.now();
  const brandPrefix = `explainer/brand/${scroChar.clerkUserId}`;
  const [beforeStartUrl, beforeEndUrl] = await Promise.all([
    persistBuffer(startBuf, `${brandPrefix}/promo-a-before-start-${ts}.png`, "image/png"),
    persistBuffer(endBuf, `${brandPrefix}/promo-a-before-end-${ts}.png`, "image/png"),
  ]);

  await writeFile(join(MARKETING_DIR, "promo-a-before-start.png"), startBuf);
  await sendMarketingPhotoToTelegram(startBuf, {
    fileName: "promo-a-before-start.png",
    caption:
      "🎬 [Promo A - Step 1] Scro 'Before' Keyframe (Cramped Messy Bedroom) generated via OpenRouter Seedream 5.0 Pro",
  });

  // Step 2: Generate 6s "Before" source video via OpenRouter Hailuo-3 with English speech & finger snap
  console.log("2. Submitting 6s 'Before' source video on OpenRouter minimax/hailuo-3...");
  const sourceVideoMotionPrompt = [
    "The young woman in the dark blazer speaks in English directly to the camera with natural lip movement:",
    "\"Still filming in a messy room or paying thousands for a studio? Watch this.\"",
    "At 2 seconds she snaps her fingers with a confident smile and continues gesturing naturally as she speaks. Locked 9:16 camera.",
  ].join(" ");

  const sourceSubmitted = await submitOpenRouterClipVideo({
    model: OPENROUTER_HAILUO_3_VIDEO_MODEL,
    prompt: sourceVideoMotionPrompt,
    aspectRatio: "9:16",
    durationSeconds: 6,
    startImageUrl: beforeStartUrl,
    endImageUrl: beforeEndUrl,
  });

  const rawSourceVideoUrl =
    sourceSubmitted.video?.url ||
    (await pollOpenRouterVideoUntilDone(sourceSubmitted.status_url!));

  const authHeaders = openRouterAuthHeaders(rawSourceVideoUrl);
  const srcVidRes = await fetch(
    rawSourceVideoUrl,
    authHeaders ? { headers: authHeaders } : undefined,
  );
  if (!srcVidRes.ok) {
    throw new Error(`Failed to download OpenRouter video (${srcVidRes.status})`);
  }
  const sourceVideoBuf = Buffer.from(await srcVidRes.arrayBuffer());
  const sourceVideoBlobUrl = await persistBuffer(
    sourceVideoBuf,
    `${brandPrefix}/promo-a-source-${ts}.mp4`,
    "video/mp4",
  );
  await writeFile(join(MARKETING_DIR, "promo-a-source-before.mp4"), sourceVideoBuf);
  console.log("Saved Before source video:", sourceVideoBlobUrl);

  // Step 3: Dogfood Scro's real Teleport service (`runTeleportJobInBackground`) for two luxury/cinematic scenes
  console.log("3. Running Scro Teleport Pipeline for Scene 1 (Manhattan Sunset Penthouse) & Scene 2 (Tokyo Neon Street)...");
  const teleportCol = await teleportJobsCollection();
  const now = new Date();
  const job1Id = new ObjectId();
  const job2Id = new ObjectId();

  const job1Doc: TeleportJob & { _id: ObjectId } = {
    _id: job1Id,
    userId: owner._id,
    clerkUserId: scroChar.clerkUserId,
    status: "rendering",
    sourceVideoUrl: sourceVideoBlobUrl,
    aspectRatio: "9:16",
    sectionStart: 0,
    sectionLength: 6,
    scenePrompt:
      "A breathtaking billionaire Manhattan penthouse loft at golden-hour sunset with floor-to-ceiling glass windows overlooking the glowing NYC skyline, warm amber sunlight rim-lighting the subject.",
    scenePlateGenerated: false,
    keepSourceAudio: true,
    applyColorFix: true,
    createdAt: now,
    updatedAt: now,
  };

  const job2Doc: TeleportJob & { _id: ObjectId } = {
    _id: job2Id,
    userId: owner._id,
    clerkUserId: scroChar.clerkUserId,
    status: "rendering",
    sourceVideoUrl: sourceVideoBlobUrl,
    aspectRatio: "9:16",
    sectionStart: 0,
    sectionLength: 6,
    scenePrompt:
      "A cinematic Shibuya Tokyo street at night after rain with glowing neon billboards, wet pavement reflections, and shallow depth-of-field bokeh.",
    scenePlateGenerated: false,
    keepSourceAudio: true,
    applyColorFix: true,
    createdAt: now,
    updatedAt: now,
  };

  await teleportCol.insertMany([job1Doc, job2Doc]);

  const [doneJob1, doneJob2] = await Promise.all([
    waitForTeleportJob(job1Id, "Manhattan-Penthouse"),
    waitForTeleportJob(job2Id, "Tokyo-Neon-Street"),
  ]);

  const [after1Buf, after2Buf] = await Promise.all([
    fetch(doneJob1.outputVideoUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
    fetch(doneJob2.outputVideoUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
  ]);

  const after1Path = join(MARKETING_DIR, "promo-a-teleport-penthouse.mp4");
  const after2Path = join(MARKETING_DIR, "promo-a-teleport-tokyo.mp4");
  await Promise.all([
    writeFile(after1Path, after1Buf),
    writeFile(after2Path, after2Buf),
  ]);

  // Step 4: Assemble the 3-part fast-paced Promo A Reel (0-2s Messy Room -> 2-4s Manhattan Penthouse -> 4-6s Tokyo Neon)
  console.log("4. Assembling final English Promo A reel with hook overlays...");
  const [ov1, ov2, ov3] = await Promise.all([
    createPromoOverlayPng({
      topBadge: "BEFORE · MESSY ROOM",
      topTitleLine1: "Still filming in a messy room?",
      topTitleLine2: "Or paying $2,000/hr for a studio?",
      bottomPill: "📍 Cramped Bedroom (Original Clip)",
      accentColor: "#fb7185",
    }),
    createPromoOverlayPng({
      topBadge: "SCRO TELEPORT #1",
      topTitleLine1: "1 Click Background Swap",
      topTitleLine2: "Same motion · Real sunset relighting",
      bottomPill: "🌆 NYC Sunset Penthouse (Teleported)",
      accentColor: "#d4ff33",
    }),
    createPromoOverlayPng({
      topBadge: "SCRO TELEPORT #2",
      topTitleLine1: "Infinite Studios in Seconds",
      topTitleLine2: "No green screen · Natural hair & light",
      bottomPill: "🌃 Tokyo Neon Night (Teleported)",
      accentColor: "#38bdf8",
    }),
  ]);

  await Promise.all([
    writeFile(join(MARKETING_DIR, "ov1.png"), ov1),
    writeFile(join(MARKETING_DIR, "ov2.png"), ov2),
    writeFile(join(MARKETING_DIR, "ov3.png"), ov3),
  ]);

  // Cut segment 1 (0..2s from before), segment 2 (2..4s from penthouse), segment 3 (4..6s from tokyo)
  // so Scro's continuous motion & speech play seamlessly across the 3 worlds!
  await runFfmpeg(MARKETING_DIR, [
    "-y",
    "-ss", "0", "-t", "2", "-i", "promo-a-source-before.mp4",
    "-i", "ov1.png",
    "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24[v];[v][1:v]overlay=0:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac",
    "seg1.mp4",
  ]);

  await runFfmpeg(MARKETING_DIR, [
    "-y",
    "-ss", "2", "-t", "2", "-i", "promo-a-teleport-penthouse.mp4",
    "-i", "ov2.png",
    "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24[v];[v][1:v]overlay=0:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac",
    "seg2.mp4",
  ]);

  await runFfmpeg(MARKETING_DIR, [
    "-y",
    "-ss", "4", "-t", "2", "-i", "promo-a-teleport-tokyo.mp4",
    "-i", "ov3.png",
    "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24[v];[v][1:v]overlay=0:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac",
    "seg3.mp4",
  ]);

  await writeFile(
    join(MARKETING_DIR, "concat-list.txt"),
    "file 'seg1.mp4'\nfile 'seg2.mp4'\nfile 'seg3.mp4'\n",
  );

  const finalPromoPath = join(MARKETING_DIR, "promo-a-scro-teleport-en.mp4");
  await runFfmpeg(MARKETING_DIR, [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", "concat-list.txt",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-c:a", "aac",
    "-movflags", "+faststart",
    "promo-a-scro-teleport-en.mp4",
  ]);

  console.log("5. Sending Promo A video & Dogfooding Feature Ideas to Telegram...");
  await sendMarketingVideoToTelegram(finalPromoPath, {
    caption:
      "🚀 [Promo A · English · Scro Teleport]\n" +
      "Hook: \"Still filming in a messy room? Or paying $2,000/hr for a studio?\"\n" +
      "• 0–2s: Cramped Messy Room (Original)\n" +
      "• 2–4s: NYC Sunset Penthouse (Scro Teleport #1)\n" +
      "• 4–6s: Tokyo Neon Street (Scro Teleport #2)\n" +
      "Continuous motion across all 3 worlds!",
  });

  const productIdeasMessage = [
    "💡 [Scro Teleport Dogfooding — 4 Product Feature Ideas Discovered While Building Promo A]",
    "",
    "1️⃣ Multi-Scene 'Beat-Cut Teleport' Mode in /app/teleport:",
    "While making Promo A, we had to create 2 separate TeleportJobs (Penthouse + Tokyo) on the same source clip and slice 0–2s / 2–4s / 4–6s in FFmpeg. If /app/teleport lets a user pick 2–3 scenes and auto-cuts on the beat (Before -> Scene 1 -> Scene 2) in one click, every creator can make this exact viral transition reel natively!",
    "",
    "2️⃣ Reuse SAM 3 Mannequin Across Multiple Scene Teleports:",
    "Currently, running 2 Teleport jobs on the same source video runs `buildSam3MannequinAndMaskVideos` (`fal-ai/sam-3/video-rle`) twice on identical source frames. Caching `mannequinVideoUrl` + `identityFrameUrl` by `(sourceVideoUrl, sectionStart, sectionLength)` saves 50% of fal SAM 3 latency and cost when testing multiple backgrounds.",
    "",
    "3️⃣ Bring SAM 3 RLE Person Selector to /app/teleport:",
    "We just added `fal-ai/sam-3/image-rle` multi-person RLE silhouette picking to Scro Swap, but Teleport (`src/service/teleport/pipeline.ts:210`) still hardcodes `target: 'person'` without letting the user pick which person(s) to bring into the new scene.",
    "",
    "4️⃣ Built-in 'Before / After Showcase' Export Toggle:",
    "Users love sharing the Before-vs-After transformation on Reels/TikTok. Adding a 1-click 'Export Before → After Split/Cut Reel' button on completed Teleport jobs (with auto location badges) turns every user export into free viral marketing for scro.io.",
  ].join("\n");

  await sendMarketingTextToTelegram(productIdeasMessage);
  console.log("=== Promo A Complete & Delivered to Telegram! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Promo A failed:", err);
  process.exit(1);
});
