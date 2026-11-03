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
  chooseOnScreenTextKeyColor,
  cropVerticalTransparentMargin,
  keyColorDifferencePng,
  onScreenTextPrompt,
} from "../src/service/opencut/on-screen-text";
import {
  fetchOpenRouterStatus,
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  openRouterAuthHeaders,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "../src/service/openrouter/generate";
import { ffmpegStderr, runFfmpeg } from "../src/service/reel/concat";
import {
  advanceTeleportJobs,
  runTeleportJobInBackground,
} from "../src/service/teleport/pipeline";
import {
  groupAlignmentTokens,
  synthesizeSpeechWithTimestamps,
  type ElevenLabsAlignment,
} from "../src/service/voice/elevenlabs";
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

async function pollOpenRouterVideoUntilDone(
  statusUrl: string,
  label: string,
): Promise<string> {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const polled = await fetchOpenRouterStatus(statusUrl);
    console.log(`[${label} Poll ${i + 1}] status=${polled.status}`);
    if (polled.status === "completed" && polled.video?.url) {
      return polled.video.url;
    }
    if (polled.status === "failed" || polled.status === "nsfw") {
      throw new Error(polled.error || `${label} failed`);
    }
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForTeleportJob(
  jobId: ObjectId,
  label: string,
): Promise<TeleportJob & { _id: ObjectId }> {
  const col = await teleportJobsCollection();
  await runTeleportJobInBackground(jobId);

  for (let i = 0; i < 110; i++) {
    const doc = (await col.findOne({ _id: jobId })) as
      | (TeleportJob & { _id: ObjectId })
      | null;
    if (!doc) throw new Error(`Teleport job ${label} disappeared`);
    console.log(
      `[Teleport ${label} Poll ${i + 1}] status=${doc.status} out=${doc.outputVideoUrl || ""}`,
    );
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

/** Find the start timestamp (in seconds) of a target word/phrase from ElevenLabs alignment. */
function findWordStartSec(
  alignment: ElevenLabsAlignment | undefined,
  needle: string,
  fallbackSec: number,
): number {
  const tokens = groupAlignmentTokens(alignment, 0);
  const cleanNeedle = needle.toLowerCase();
  for (const tok of tokens) {
    const w = (tok.token || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (w === cleanNeedle || (w.length >= 5 && w.startsWith(cleanNeedle.slice(0, 5)))) {
      return Math.max(1.5, Math.round(tok.start * 100) / 100);
    }
  }
  return fallbackSec;
}

/**
 * Generate an AI artistic on-screen text graphic using Scro's own `onScreenTextPrompt` +
 * `keyColorDifferencePng` + `cropVerticalTransparentMargin` (`src/service/opencut/on-screen-text.ts`).
 */
async function generateAiArtisticTextOverlay(input: {
  text: string;
  lookLine: string;
  keyId: string;
  fileName: string;
}): Promise<Buffer> {
  const keyColor = chooseOnScreenTextKeyColor({
    textStyleId: input.keyId,
    lookLine: input.lookLine,
  });
  const prompt = onScreenTextPrompt({
    text: input.text,
    lookLine: input.lookLine,
    keyColor,
  });

  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "16:9",
    resolution: "2k",
  });
  const rawUrl = res.images?.[0]?.url;
  if (!rawUrl) throw new Error(`Seedream did not return AI text image for ${input.text}`);
  const rawBuf = await imageUrlToBuffer(rawUrl);
  const { png } = await keyColorDifferencePng(rawBuf, keyColor);
  const cropped = await cropVerticalTransparentMargin(png, 20);

  // Place the cropped AI artistic lettering onto a full 1080x1920 transparent frame (top area y=110)
  const scaledPlate = await sharp(cropped)
    .resize(980, 320, { fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(scaledPlate).metadata();
  const left = Math.round((1080 - (meta.width || 980)) / 2);

  const canvas = await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: scaledPlate, left, top: 110 }])
    .png()
    .toBuffer();

  await writeFile(join(MARKETING_DIR, input.fileName), canvas);
  return canvas;
}

async function main() {
  console.log("=== Starting Promo A v2: Continuous Talking Head + 3 Extreme Light Teleports + AI Artistic Text ===");

  const charCol = await charactersCollection();
  const scroChar = await charCol.findOne({ _id: new ObjectId(SCRO_CHARACTER_ID) });
  if (!scroChar) throw new Error("Scro character not found");

  const userCol = await usersCollection();
  const owner = await userCol.findOne({ clerkUserId: scroChar.clerkUserId });
  if (!owner) throw new Error("Owner user not found");

  // Pick Scro's casual pink crop-top + baggy jeans version (version index 6)
  const completedVersions = (scroChar.versions || []).filter((v) => v.status === "completed");
  const casualVer = completedVersions[completedVersions.length - 1]!;
  const scroCasualRefs = [casualVer.portraitUrl, casualVer.profileUrl].filter(
    (u): u is string => Boolean(u),
  );
  const voiceId =
    scroChar.voiceSamples?.en?.elevenVoiceId ||
    scroChar.voiceSample?.elevenVoiceId ||
    "21m00Tcm4TlvDq8ikWAM";

  const ts = Date.now();
  const brandPrefix = `explainer/brand/${scroChar.clerkUserId}`;

  // ============================================================================
  // STEP 1A: Exaggerated Casual Messy-Hair Smudged-Face Disaster Bedroom Start Still
  // ============================================================================
  console.log("Step 1A: Loading or generating exaggerated casual messy-hair smudged-face Scro start frame...");
  let startFrameBuf: Buffer;
  const cachedStartPath = join(MARKETING_DIR, "promo-a-v2-start.png");
  try {
    const { readFile } = await import("node:fs/promises");
    startFrameBuf = await readFile(cachedStartPath);
    console.log("Reusing already-generated promo-a-v2-start.png");
  } catch {
    const startStillPrompt = [
      "Photorealistic 9:16 vertical creator reel frame of the exact young East Asian woman from the attached character reference images (Scro), keeping her exact facial bone structure, eyes, nose, and lips.",
      "Casual messy look: she wears her soft pale pink athletic spaghetti-strap crop top with an oversized, wrinkled, coffee-stained grey zip hoodie slipping off one shoulder and baggy blue jeans.",
      "Exaggerated expression & hair: wild, frizzy, tangled bedhead hair sticking out in every direction, a smudge of dark coffee/soot on her cheek and nose tip, wide shocked eyes and open mouth in comic panic, both hands raised near her messy hair.",
      "Background: an ultra-chaotic disaster bedroom overflowing with toppled pizza and takeout boxes, mountains of unfolded laundry, tangled cables hanging off a cluttered desk, and harsh flat fluorescent ceiling light.",
    ].join(" ");

    const startImgRes = await submitOpenRouterImage({
      model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
      prompt: startStillPrompt,
      aspectRatio: "9:16",
      resolution: "2k",
      referenceImageUrls: scroCasualRefs,
    });
    startFrameBuf = await imageUrlToBuffer(startImgRes.images![0]!.url!);
    await writeFile(cachedStartPath, startFrameBuf);

    await sendMarketingPhotoToTelegram(startFrameBuf, {
      fileName: "promo-a-v2-start.png",
      caption:
        "😱 [Promo A v2 - Step 1] Exaggerated Casual Scro Opening Frame (Wild messy bedhead hair, smudged cheek, casual pink crop top + stained hoodie, total disaster bedroom)",
    });
  }
  const startFrameJpegBuf = await sharp(startFrameBuf).jpeg({ quality: 92 }).toBuffer();
  const startFrameBlobUrl = await persistBuffer(
    startFrameJpegBuf,
    `${brandPrefix}/promo-a-v2-start-${ts}.jpg`,
    "image/jpeg",
  );

  // ============================================================================
  // STEP 1B: ElevenLabs English Voiceover with Exact Word Timestamps
  // ============================================================================
  console.log("Step 1B: Synthesizing continuous English spoken script with word timestamps...");
  const spokenScript =
    "Look at this total disaster! Wait, one click: mountain sunset, blazing noon beach, or midnight neon disco!";

  const ttsRes = await synthesizeSpeechWithTimestamps(voiceId, spokenScript, {
    conversational: true,
    language: "en",
  });
  const voBlobUrl = await persistBuffer(
    ttsRes.audio,
    `${brandPrefix}/promo-a-v2-vo-${ts}.mp3`,
    "audio/mpeg",
  );
  await writeFile(join(MARKETING_DIR, "promo-a-v2-vo.mp3"), ttsRes.audio);

  const cut1Sec = findWordStartSec(ttsRes.alignment, "mountain", 3.0);
  const cut2Sec = findWordStartSec(ttsRes.alignment, "blazing", 5.2);
  const cut3Sec = findWordStartSec(ttsRes.alignment, "midnight", 7.4);
  console.log("Resolved beat-cut timestamps from voice alignment:", {
    cut1Sec,
    cut2Sec,
    cut3Sec,
  });

  // Probe exact audio duration
  const voProbe = await ffmpegStderr(MARKETING_DIR, ["-i", "promo-a-v2-vo.mp3"]);
  const durMatch = voProbe.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const audioDurSec = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 10;
  const clipDurationSec = Math.min(15, Math.max(6, Math.ceil(audioDurSec)));
  console.log(`Audio duration: ${audioDurSec.toFixed(2)}s -> clipDurationSec: ${clipDurationSec}s`);

  // ============================================================================
  // STEP 1C: Continuous Talking Head Video (`heygen/avatar-iv` via OpenRouter)
  // ============================================================================
  console.log("Step 1C: Generating continuous Talking Head video on OpenRouter heygen/avatar-iv...");
  const avatarSubmitted = await submitOpenRouterClipVideo({
    model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    prompt:
      "The young woman speaks expressively to the camera in English with animated hand gestures, starting in comic panic at her messy room and then grinning confidently as she names each new location.",
    motionPrompt:
      "Natural expressive creator performance, lively eyebrows, natural head nods and hand gestures synced to speech.",
    expressiveness: "high",
    aspectRatio: "9:16",
    durationSeconds: clipDurationSec,
    startImageUrl: startFrameBlobUrl,
    audioUrl: voBlobUrl,
  });

  const rawTalkingHeadUrl =
    avatarSubmitted.video?.url ||
    (await pollOpenRouterVideoUntilDone(
      avatarSubmitted.status_url!,
      "Promo-A-v2-TalkingHead",
    ));

  const thHeaders = openRouterAuthHeaders(rawTalkingHeadUrl);
  const thRes = await fetch(rawTalkingHeadUrl, thHeaders ? { headers: thHeaders } : undefined);
  if (!thRes.ok) {
    throw new Error(`Failed to download Talking Head video (${thRes.status})`);
  }
  const talkingHeadBuf = Buffer.from(await thRes.arrayBuffer());
  const talkingHeadBlobUrl = await persistBuffer(
    talkingHeadBuf,
    `${brandPrefix}/promo-a-v2-talkinghead-${ts}.mp4`,
    "video/mp4",
  );
  await writeFile(join(MARKETING_DIR, "promo-a-v2-talkinghead.mp4"), talkingHeadBuf);
  console.log("Saved continuous Talking Head source video:", talkingHeadBlobUrl);

  // ============================================================================
  // STEP 2 & STEP 3 (In Parallel):
  // - Run 3 Extreme-Lighting Scro Teleport Jobs on the Continuous Talking Head Video
  // - Generate 4 AI Artistic On-Screen Text Plates via Seedream 5.0 Pro + Chroma Key
  // ============================================================================
  console.log("Step 2 & 3: Running 3 Extreme-Lighting Teleports + 4 AI Artistic Text Overlays in parallel...");
  const teleportCol = await teleportJobsCollection();
  const now = new Date();
  const jobSunsetId = new ObjectId();
  const jobBeachId = new ObjectId();
  const jobDiscoId = new ObjectId();

  const teleportDocs: Array<TeleportJob & { _id: ObjectId }> = [
    {
      _id: jobSunsetId,
      userId: owner._id,
      clerkUserId: scroChar.clerkUserId,
      status: "rendering",
      sourceVideoUrl: talkingHeadBlobUrl,
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: clipDurationSec,
      scenePrompt:
        "A dramatic rocky mountain summit ridge at fiery golden-hour sunset above a sea of clouds; intense low-angle warm orange-gold sunlight shines from the LEFT side, casting a glowing amber rim light across her hair, cheek, and shoulders with deep warm shadows on the right side.",
      scenePlateGenerated: false,
      keepSourceAudio: true,
      applyColorFix: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: jobBeachId,
      userId: owner._id,
      clerkUserId: scroChar.clerkUserId,
      status: "rendering",
      sourceVideoUrl: talkingHeadBlobUrl,
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: clipDurationSec,
      scenePrompt:
        "A crystal-clear Maldives white-sand beach shoreline under blazing tropical high-noon sun directly overhead; crisp bright white daylight from straight ABOVE and shimmering turquoise ocean bounce light from below, high-key sunlit summer colors.",
      scenePlateGenerated: false,
      keepSourceAudio: true,
      applyColorFix: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: jobDiscoId,
      userId: owner._id,
      clerkUserId: scroChar.clerkUserId,
      status: "rendering",
      sourceVideoUrl: talkingHeadBlobUrl,
      aspectRatio: "9:16",
      sectionStart: 0,
      sectionLength: clipDurationSec,
      scenePrompt:
        "A dark underground midnight cyber disco club with a spinning mirror ball and laser beams cutting through smoky air; dramatic dual-color neon lighting with hot magenta light hitting the RIGHT side of her face and electric cyan-blue light hitting the LEFT side against a dark club backdrop.",
      scenePlateGenerated: false,
      keepSourceAudio: true,
      applyColorFix: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await teleportCol.insertMany(teleportDocs);

  const [
    doneSunset,
    doneBeach,
    doneDisco,
    ,
    ,
    ,
    ,
  ] = await Promise.all([
    waitForTeleportJob(jobSunsetId, "1-Mountain-Sunset"),
    waitForTeleportJob(jobBeachId, "2-Noon-Beach"),
    waitForTeleportJob(jobDiscoId, "3-Midnight-Disco"),
    generateAiArtisticTextOverlay({
      text: "TOTAL DISASTER ROOM?!",
      lookLine:
        "Bold comic pop-art sticker lettering with jagged yellow-and-red warning tape texture, thick black ink outline, and expressive hand-drawn grunge splatters.",
      keyId: "sticker",
      fileName: "ai-text-1-disaster.png",
    }),
    generateAiArtisticTextOverlay({
      text: "GOLDEN SUNSET PEAK",
      lookLine:
        "Cinematic 3D brushed warm molten gold and sunset-amber metallic title lettering with glowing warm rim highlights and a dark charcoal drop shadow.",
      keyId: "clean",
      fileName: "ai-text-2-sunset.png",
    }),
    generateAiArtisticTextOverlay({
      text: "BLAZING NOON BEACH",
      lookLine:
        "Crisp tropical summer surfboard glossy white-and-turquoise 3D lettering with sunlit water-droplet specular highlights and a deep navy outline.",
      keyId: "clean",
      fileName: "ai-text-3-beach.png",
    }),
    generateAiArtisticTextOverlay({
      text: "MIDNIGHT NEON DISCO · SCRO.IO",
      lookLine:
        "Glowing cyberpunk nightclub neon tube lettering in electric cyan and hot pink chrome with retro disco sparkles and a dark outer halo.",
      keyId: "neon",
      fileName: "ai-text-4-disco.png",
    }),
  ]);

  const [sunsetBuf, beachBuf, discoBuf] = await Promise.all([
    fetch(doneSunset.outputVideoUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
    fetch(doneBeach.outputVideoUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
    fetch(doneDisco.outputVideoUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
  ]);

  await Promise.all([
    writeFile(join(MARKETING_DIR, "promo-a-v2-1-sunset.mp4"), sunsetBuf),
    writeFile(join(MARKETING_DIR, "promo-a-v2-2-beach.mp4"), beachBuf),
    writeFile(join(MARKETING_DIR, "promo-a-v2-3-disco.mp4"), discoBuf),
  ]);

  // ============================================================================
  // STEP 4: Beat-Synced Splice Preserving Continuous Speech & Motion + AI Text
  // ============================================================================
  console.log("Step 4: Splicing on exact spoken word timestamps with AI artistic text overlays...");

  // Probe actual duration of the talking-head video
  const thProbe = await ffmpegStderr(MARKETING_DIR, ["-i", "promo-a-v2-talkinghead.mp4"]);
  const thDurMatch = thProbe.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const totalVidDur = thDurMatch
    ? Number(thDurMatch[1]) * 3600 + Number(thDurMatch[2]) * 60 + Number(thDurMatch[3])
    : audioDurSec;

  const t1 = Math.min(totalVidDur * 0.3, Math.max(1.8, cut1Sec));
  const t2 = Math.min(totalVidDur * 0.56, Math.max(t1 + 1.6, cut2Sec));
  const t3 = Math.min(totalVidDur * 0.78, Math.max(t2 + 1.6, cut3Sec));
  const tEnd = Math.max(t3 + 1.5, totalVidDur);

  console.log("Final splice windows:", {
    seg1_MessyRoom: `0.00s -> ${t1.toFixed(2)}s`,
    seg2_MountainSunset: `${t1.toFixed(2)}s -> ${t2.toFixed(2)}s`,
    seg3_NoonBeach: `${t2.toFixed(2)}s -> ${t3.toFixed(2)}s`,
    seg4_MidnightDisco: `${t3.toFixed(2)}s -> ${tEnd.toFixed(2)}s`,
  });

  const segments = [
    {
      inVideo: "promo-a-v2-talkinghead.mp4",
      textPng: "ai-text-1-disaster.png",
      start: 0,
      dur: t1,
      out: "v2-seg1.mp4",
    },
    {
      inVideo: "promo-a-v2-1-sunset.mp4",
      textPng: "ai-text-2-sunset.png",
      start: t1,
      dur: t2 - t1,
      out: "v2-seg2.mp4",
    },
    {
      inVideo: "promo-a-v2-2-beach.mp4",
      textPng: "ai-text-3-beach.png",
      start: t2,
      dur: t3 - t2,
      out: "v2-seg3.mp4",
    },
    {
      inVideo: "promo-a-v2-3-disco.mp4",
      textPng: "ai-text-4-disco.png",
      start: t3,
      dur: Math.max(1.2, tEnd - t3),
      out: "v2-seg4.mp4",
    },
  ];

  for (const seg of segments) {
    await runFfmpeg(MARKETING_DIR, [
      "-y",
      "-ss",
      seg.start.toFixed(2),
      "-t",
      seg.dur.toFixed(2),
      "-i",
      seg.inVideo,
      "-i",
      seg.textPng,
      "-filter_complex",
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24[v];[v][1:v]overlay=0:0",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      seg.out,
    ]);
  }

  await writeFile(
    join(MARKETING_DIR, "v2-concat.txt"),
    segments.map((s) => `file '${s.out}'`).join("\n") + "\n",
  );

  // Concat the 4 visual segments and mux the original continuous Talking Head audio track
  // so there is ZERO audio seam or pop across the 3 Teleport transitions!
  const finalV2Path = join(MARKETING_DIR, "promo-a-v2-scro-teleport-en.mp4");
  await runFfmpeg(MARKETING_DIR, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "v2-concat.txt",
    "-i",
    "promo-a-v2-talkinghead.mp4",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    "promo-a-v2-scro-teleport-en.mp4",
  ]);

  console.log("Sending Promo A v2 video to Telegram...");
  await sendMarketingVideoToTelegram(finalV2Path, {
    caption:
      "🔥 [Promo A v2 · Continuous Talking Head + 3 Extreme-Light Teleports + AI Artistic Text]\n" +
      "1️⃣ 0.0s–" +
      t1.toFixed(1) +
      "s: Messy Bedhead + Smudged Cheek in Disaster Room (Original Talking Head)\n" +
      "2️⃣ " +
      t1.toFixed(1) +
      "s–" +
      t2.toFixed(1) +
      "s: Mountain Peak at Golden Sunset (Side Warm Rim Light)\n" +
      "3️⃣ " +
      t2.toFixed(1) +
      "s–" +
      t3.toFixed(1) +
      "s: Tropical Beach at Blazing High Noon (Overhead Daylight + Ocean Bounce)\n" +
      "4️⃣ " +
      t3.toFixed(1) +
      "s–End: Midnight Cyber Disco (Magenta/Cyan Club Lasers)\n" +
      "✨ Continuous unbroken speech & lip-sync + AI-painted artistic text plates!",
  });

  await sendMarketingTextToTelegram(
    [
      "💡 [New Product Idea from Building Promo A v2]",
      "",
      "🎯 'Word-Beat Multi-Teleport' in Talking-Head / OpenCut Editor:",
      "Because ElevenLabs gives us exact per-word alignment timestamps (`groupAlignmentTokens`), when a user records or generates a Talking Head clip that mentions multiple places ('mountain sunset... noon beach... midnight disco'), Scro can automatically detect location keywords, trigger Teleport on those exact time ranges, and generate matching AI artistic text titles for each cut automatically!",
    ].join("\n"),
  );

  console.log("=== Promo A v2 Complete & Sent to Telegram! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Promo A v2 failed:", err);
  process.exit(1);
});
