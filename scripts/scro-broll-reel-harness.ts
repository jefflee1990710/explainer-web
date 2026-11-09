import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { persistBuffer } from "@/service/higgsfield/persist";
import { applyJutsuColorGradeBuffer } from "@/service/jutsu/color-grade";
import {
  fetchOpenRouterStatus,
  heyGenAvatarIvMotionPrompt,
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterClipVideo,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { synthesizeSpeech } from "@/service/voice/elevenlabs";
import type { VoLanguage } from "@/model/project";
import {
  generateSeedreamReelCover,
  probeVideoDurationSeconds,
  recordLiveChromeAndExportScreenStudio,
} from "./scro-split-reel-harness";

loadEnvConfig(process.cwd());

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG_BIN = ffmpegPath && existsSync(ffmpegPath) ? ffmpegPath : "ffmpeg";

export type BRollSegment = {
  /** Start time in seconds along the A-Roll timeline (e.g. 2.8s after the opening A-Roll face hook) */
  start: number;
  /** End time in seconds along the A-Roll timeline */
  end: number;
  /** Which B-Roll source to show: "screen-studio" (Chrome UI recording), "result-1", "result-2", or "result-3" */
  source: "screen-studio" | "result-1" | "result-2" | "result-3";
  /** Step badge label shown above the B-Roll card (e.g. "STEP 1 · TYPE PROMPT & CLICK GENERATE") */
  stepBadge: string;
};

export type BRollSubtitleCue = {
  start: number;
  end: number;
  lines: string[];
};

export type BRollReelHarnessConfig = {
  /** Short slug/name used for output filenames and .screenstudio bundle */
  name: string;
  /** Feature route on scro.io ("explainer" | "swap" | "teleport" | "talking" | "story") */
  feature: "explainer" | "swap" | "teleport" | "talking" | "story";
  /** MongoDB videos._id to open in the OpenCut editor during Screen Studio B-Roll recording */
  videoId: string;
  /** Prompt text typed live into the creation textarea during Screen Studio B-Roll recording */
  promptText: string;
  /** Whether to record clicking the "Extend +6s" button & dialog inside OpenCut */
  showExtendDialog?: boolean;
  /** Duration (seconds) to show the full-screen 9:16 A-Roll Talking Head face at the start before B-Roll cuts in (default: 2.8s) */
  openingFaceSeconds?: number;
  /** Path to an existing vertical 9:16 A-Roll Talking Head MP4 (if omitted, generated via ElevenLabs + HeyGen Avatar IV 9:16 + Color Fix) */
  aRollVideoPath?: string;
  /** Spoken script for the A-Roll Talking Head teaching how to use Scro */
  aRollScript: string;
  /** Language of the A-Roll Talking Head ("en" | "yue" | "zh") */
  aRollLanguage?: VoLanguage;
  /** ElevenLabs voice ID for the A-Roll Talking Head (defaults to Scro's cloned voice) */
  aRollVoiceId?: string;
  /** Character blueprint URL for generating the A-Roll start frame */
  aRollCharacterBlueprintUrl?: string;
  /** Start frame prompt for the vertical 9:16 A-Roll Talking Head */
  aRollStartFramePrompt?: string;
  /** Path to Result Video 1 (16:9 MP4) shown as B-Roll */
  resultVideo1Path: string;
  /** Path to Result Video 2 (16:9 MP4) shown as B-Roll */
  resultVideo2Path: string;
  /** Optional Path to Result Video 3 (16:9 MP4) shown as B-Roll */
  resultVideo3Path?: string;
  /** Timeline windows where B-Roll ("screen-studio", "result-1", "result-2") cuts in while A-Roll VO keeps talking */
  bRollSegments?: BRollSegment[];
  /** Subtitle cues synced to the A-Roll speech */
  subtitleCues: BRollSubtitleCue[];
  /** White prefix of the middle hook title (e.g. "HOW TO CREATE") */
  hookPrefix: string;
  /** Neon-lime (#A3FF47) highlighted part of the middle hook title (e.g. "2K AI VIDEOS IN SCRO") */
  hookHighlight: string;
  /** Top pill badge text on the 9:16 cover (e.g. "#SCRO TUTORIAL") */
  coverBadge: string;
  /** Centered Torn-Paper (撕紙 style) headline on the 9:16 cover */
  coverHeadline: string;
  /** Unique dramatic poster scene, lighting, and camera direction for the Seedream 5.0 Pro 9:16 cover */
  coverCenterPrompt: string;
  /** Optional dramatic lighting & lens override for the cover poster */
  coverDramaticStylePrompt?: string;
  /** Reference scene/character images (paths) for Seedream 5.0 Pro cover */
  coverSceneImagePaths?: string[];
  /** Output directory (defaults to Marketing/) */
  outDir?: string;
};

/**
 * Step 1: Ensure or generate the VERTICAL (9:16) A-Roll Talking Head video
 * (ElevenLabs VO -> Seedream 5.0 Pro 9:16 Start Frame -> HeyGen Avatar IV 9:16 -> OpenJutsu Color Fix).
 */
export async function ensureARollTalkingHeadVideo(
  config: BRollReelHarnessConfig,
  workDir: string,
): Promise<string> {
  if (config.aRollVideoPath && existsSync(config.aRollVideoPath)) {
    return config.aRollVideoPath;
  }

  const outARollPath = path.join(workDir, "aroll_vertical_9x16_color_fixed.mp4");
  if (existsSync(outARollPath) && readFileSync(outARollPath).length > 500_000) {
    return outARollPath;
  }

  const language = config.aRollLanguage || "en";
  const voiceId = config.aRollVoiceId || "fE3jtPUA7zZ3vjTekQhI";
  const blueprintUrl = config.aRollCharacterBlueprintUrl?.trim() || "";
  const startPrompt =
    config.aRollStartFramePrompt ||
    "Vertical 9:16 medium close-up collarbone-up selfie-reel portrait of a gorgeous 24-year-old creator woman with luminous fair porcelain-white skin, soft wavy chestnut-brown shoulder-length hair, and bright expressive dark-brown eyes, wearing a chic cream-white ribbed knit top under a tailored light-taupe blazer, seated in a warm sunlit modern creator studio with subtle glowing neon-lime and warm tungsten bokeh lights behind her. One hand lightly holds a compact matte-black rectangular wireless lavalier microphone between thumb and index finger near her collarbone. She faces the camera lens directly at eye level with focused, engaging eyes and a neutral, relaxed, un-smiled conversational mouth posture (lips softly resting in a neutral speaking position, zero smile, no teeth showing). Soft diffused key light, matte-natural porous fair skin texture, zero text.";

  const voPath = path.join(workDir, "aroll_vo.mp3");
  let voBuf: Buffer;
  if (existsSync(voPath) && readFileSync(voPath).length > 10_000) {
    console.log("[B-Roll Harness] 1a. Reusing existing A-Roll VO mp3...");
    voBuf = readFileSync(voPath);
  } else {
    console.log("[B-Roll Harness] 1a. Synthesizing A-Roll VO via ElevenLabs...");
    voBuf = await synthesizeSpeech(voiceId, config.aRollScript, {
      language,
    });
    writeFileSync(voPath, voBuf);
  }
  const voBlobUrl = await persistBuffer(
    voBuf,
    `explainer/broll-reel/vo-9x16-${Date.now()}.mp3`,
    "audio/mpeg",
  );
  const voDur = probeVideoDurationSeconds(voPath);
  console.log(`[B-Roll Harness] A-Roll VO ready (${voDur.toFixed(2)}s): ${voBlobUrl}`);

  console.log("[B-Roll Harness] 1b. Generating VERTICAL 9:16 A-Roll neutral-lip start frame via Seedream 5.0 Pro...");
  const imgRes = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: startPrompt,
    aspectRatio: "9:16",
    resolution: "2k",
    referenceImageUrls: blueprintUrl ? [blueprintUrl] : [],
  });
  const dataUrl = imgRes.images?.[0]?.url;
  if (!dataUrl) throw new Error("Seedream 5.0 Pro returned no 9:16 A-Roll start image");
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const startJpgBuf = await sharp(Buffer.from(b64, "base64"))
    .resize(1080, 1920, { fit: "cover" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const startJpgPath = path.join(workDir, "aroll_start_9x16.jpg");
  writeFileSync(startJpgPath, startJpgBuf);
  const startBlobUrl = await persistBuffer(
    startJpgBuf,
    `explainer/broll-reel/start-9x16-${Date.now()}.jpg`,
    "image/jpeg",
  );

  console.log(`[B-Roll Harness] 1c. Submitting VERTICAL 9:16 A-Roll to HeyGen Avatar IV (language=${language})...`);
  const motionPrompt = heyGenAvatarIvMotionPrompt("collarbone-close", {
    language,
    spokenScript: config.aRollScript,
  });
  const sub = await submitOpenRouterClipVideo(
    {
      model: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
      prompt: motionPrompt,
      motionPrompt,
      expressiveness: "medium",
      language,
      spokenScript: config.aRollScript,
      aspectRatio: "9:16",
      durationSeconds: Math.ceil(voDur),
      startImageUrl: startBlobUrl,
      audioUrl: voBlobUrl,
    },
    { callbackUrl: null },
  );

  let videoDownloadUrl: string | undefined;
  for (let i = 1; i <= 150; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetchOpenRouterStatus(sub.status_url!);
    console.log(`[B-Roll Harness] HeyGen 9:16 poll #${i}: ${st.status}`);
    if (st.status === "completed" && st.video?.url) {
      videoDownloadUrl = st.video.url;
      break;
    }
    if (st.status === "failed" || st.status === "nsfw") {
      throw new Error(`HeyGen 9:16 A-Roll failed: ${st.error || st.status}`);
    }
  }
  if (!videoDownloadUrl) throw new Error("Timed out waiting for HeyGen 9:16 A-Roll video");

  const key = process.env.OPENROUTER_API_KEY;
  const vidRes = await fetch(videoDownloadUrl, {
    headers: videoDownloadUrl.includes("openrouter.ai")
      ? { Authorization: `Bearer ${key}` }
      : undefined,
  });
  if (!vidRes.ok) throw new Error(`HeyGen download failed: ${vidRes.status}`);
  const rawAvatarBuf = Buffer.from(await vidRes.arrayBuffer());
  const rawAvatarPath = path.join(workDir, "aroll_raw_9x16.mp4");
  writeFileSync(rawAvatarPath, rawAvatarBuf);

  console.log("[B-Roll Harness] 1d. Applying OpenJutsu Color Fix to 9:16 A-Roll...");
  const gradedBuf = await applyJutsuColorGradeBuffer(rawAvatarBuf);
  writeFileSync(outARollPath, gradedBuf);
  return outARollPath;
}

/**
 * Step 3: Composite the 1440x2560 Vertical A-Roll + B-Roll Cutaway Reel:
 * - First 2–3 seconds (`0 .. openingFaceSeconds`): Full-screen 9:16 (1440x2560) vertical A-Roll Talking Head face speaking the hook!
 * - From `openingFaceSeconds` onwards: A-Roll VO continues talking seamlessly while B-Roll cuts in (`Scro UI Screen Studio recording` -> `Result Video 1` -> `Result Video 2`)!
 *   During B-Roll cutaways, the top/center displays the Scro UI recording and Result Videos with the enlarged Torn-Paper Hook Title & Step Badge, while a Picture-in-Picture (or full B-Roll card) + synced Torn-Paper Subtitles keep the tutorial engaging and crystal clear!
 */
export async function compositeBRollReel(
  config: BRollReelHarnessConfig,
  aRollMp4Path: string,
  screenStudioMp4Path: string,
  workDir: string,
  puppeteer: any,
): Promise<string> {
  const durSeconds = probeVideoDurationSeconds(aRollMp4Path);
  const openingFaceSeconds = config.openingFaceSeconds ?? 2.8;

  const defaultSegments: BRollSegment[] = [
    {
      start: openingFaceSeconds,
      end: Number((openingFaceSeconds + (durSeconds - openingFaceSeconds) * 0.52).toFixed(2)),
      source: "result-1",
      stepBadge: "STEP 1 · TYPE PROMPT IN SCRO → 2K RESULT 1",
    },
    {
      start: Number((openingFaceSeconds + (durSeconds - openingFaceSeconds) * 0.52).toFixed(2)),
      end: Number(durSeconds.toFixed(2)),
      source: "result-2",
      stepBadge: "STEP 2 · EXTEND & EDIT IN OPENCUT → 2K RESULT 2",
    },
  ];
  const segments = config.bRollSegments?.length ? config.bRollSegments : defaultSegments;
  const bRollStart = segments[0]?.start ?? openingFaceSeconds;
  const bRollEnd = segments[segments.length - 1]?.end ?? durSeconds;

  // 1. Normalize full-screen 9:16 A-Roll (1440x2560, 24fps) with master VO audio
  const normARollFull = path.join(workDir, "norm_aroll_full_1440x2560.mp4");
  spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-i", aRollMp4Path,
      "-vf", "scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,fps=24",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "44100", "-ac", "2",
      normARollFull,
    ],
    { encoding: "utf8" },
  );

  // 2. Prepare B-Roll videos:
  // - Bottom (42, 1422, 1356x814): Scro UI Screen Studio Recording padded by bRollStart so typing begins right when B-Roll cuts in at t = bRollStart!
  // - Top (61, 500, 1318x744): Result Video 1 & Result Video 2
  const normSSBottom = path.join(workDir, "norm_ss_bottom.mp4");
  const normR1 = path.join(workDir, "norm_r1.mp4");
  const normR2 = path.join(workDir, "norm_r2.mp4");
  const normR3 = path.join(workDir, "norm_r3.mp4");

  spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-stream_loop", "-1", "-i", screenStudioMp4Path,
      "-t", durSeconds.toFixed(2),
      "-vf", `scale=1356:784:force_original_aspect_ratio=decrease,pad=1356:784:(ow-iw)/2:(oh-ih)/2,fps=24,tpad=start_duration=${bRollStart.toFixed(2)}:start_mode=clone,trim=duration=${durSeconds.toFixed(2)},setpts=PTS-STARTPTS`,
      "-an",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
      normSSBottom,
    ],
    { encoding: "utf8" },
  );

  for (const [src, dst] of [
    [config.resultVideo1Path, normR1],
    [config.resultVideo2Path, normR2],
    ...(config.resultVideo3Path ? [[config.resultVideo3Path, normR3] as const] : []),
  ] as const) {
    spawnSync(
      ffmpegPath!,
      [
        "-y", "-stream_loop", "-1", "-i", src,
        "-t", durSeconds.toFixed(2),
        "-vf", "scale=1318:744:force_original_aspect_ratio=decrease,pad=1318:744:(ow-iw)/2:(oh-ih)/2,fps=24",
        "-an",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
        dst,
      ],
      { encoding: "utf8" },
    );
  }

  // Also create a circular/rounded PIP of the vertical 9:16 A-Roll speaker (`340x440`) for the corner during B-Roll, or keep the B-Roll backdrop clean
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,2560"],
    defaultViewport: { width: 1440, height: 2560, deviceScaleFactor: 1 },
  });

  const openingOverlayPath = path.join(workDir, "opening_aroll_overlay.png");
  const brollBgCanvasPath = path.join(workDir, "broll_bg_canvas.png");
  const badgePaths: string[] = [];
  const subPaths: string[] = [];

  try {
    const page = await browser.newPage();
    const logoB64 = readFileSync(path.join(process.cwd(), "Marketing/logo-mark.png")).toString("base64");

    // 1. Opening 0..2.8s overlay on top of full-screen 9:16 A-Roll Talking Head (Top S icon + Torn-Paper Hook Banner)
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin:0;width:1440px;height:2560px;background:transparent;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
          <img src="data:image/png;base64,${logoB64}" style="position:absolute;left:632px;top:140px;width:176px;height:176px;object-fit:contain;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.65));" />
          <div style="position:absolute;left:0;top:340px;width:1440px;display:flex;justify-content:center;">
            <div style="padding:10px 30px;background:#A3FF47;color:#0B0D13;font-size:32px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,0.6);">
              #SCRO AI STUDIO TUTORIAL
            </div>
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: openingOverlayPath, omitBackground: true });

    // 2. B-Roll Canvas (shown from t = bRollStart..bRollEnd while A-Roll VO continues speaking):
    // Black 1440x2560 backdrop + top S logo + enlarged middle Torn-Paper Hook Title (auto-wraps to 2 bold lines if combined title > 38 chars)
    const combinedLen = (config.hookPrefix.length + 1 + config.hookHighlight.length);
    const isTwoLineTitle = combinedLen > 38;
    const titleHtml = isTwoLineTitle
      ? `<div style="color:#FFFFFF;font-size:44px;line-height:1.14;font-weight:900;letter-spacing:0.5px;font-style:italic;text-transform:uppercase;text-shadow:0 4px 14px rgba(0,0,0,0.85);text-align:center;">
           ${config.hookPrefix}<br/><span style="color:#A3FF47;font-size:46px;text-shadow:0 0 20px rgba(163,255,71,0.55);">${config.hookHighlight}</span>
         </div>`
      : `<div style="color:#FFFFFF;font-size:64px;line-height:1.08;font-weight:900;letter-spacing:0.5px;font-style:italic;text-transform:uppercase;text-shadow:0 4px 14px rgba(0,0,0,0.85);white-space:nowrap;">
           ${config.hookPrefix} <span style="color:#A3FF47;text-shadow:0 0 20px rgba(163,255,71,0.55);">${config.hookHighlight}</span>
         </div>`;

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin:0;width:1440px;height:2560px;background:#000000;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
          <img src="data:image/png;base64,${logoB64}" style="position:absolute;left:632px;top:155px;width:176px;height:176px;object-fit:contain;" />
          <div style="position:absolute;left:0;top:1224px;width:1440px;height:168px;display:flex;align-items:center;justify-content:center;">
            <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;padding:7px 9px;background:#F5F7FA;clip-path:polygon(0% 10%, 3% 0%, 9% 7%, 16% 0%, 24% 6%, 33% 0%, 42% 6%, 51% 0%, 60% 6%, 69% 0%, 78% 6%, 87% 0%, 94% 6%, 100% 2%, 99% 35%, 100% 68%, 98% 94%, 93% 100%, 84% 94%, 75% 100%, 65% 93%, 54% 100%, 44% 94%, 35% 100%, 25% 93%, 15% 100%, 7% 94%, 1% 98%, 2% 62%, 0% 32%);filter:drop-shadow(0 0 24px rgba(163,255,71,0.42)) drop-shadow(0 10px 24px rgba(0,0,0,0.9));">
              <div style="padding:${isTwoLineTitle ? "12px 42px" : "16px 46px"};background:linear-gradient(180deg,#1B1F2E 0%,#10131C 100%);border:3px solid #A3FF47;clip-path:polygon(0% 8%, 4% 1%, 11% 6%, 19% 1%, 28% 5%, 37% 0%, 46% 5%, 55% 1%, 64% 5%, 73% 0%, 82% 5%, 91% 1%, 97% 5%, 100% 2%, 99% 36%, 100% 70%, 98% 95%, 93% 100%, 84% 95%, 75% 100%, 65% 94%, 54% 100%, 44% 95%, 35% 100%, 25% 94%, 15% 100%, 7% 95%, 1% 98%, 2% 62%, 0% 32%);">
                ${titleHtml}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: brollBgCanvasPath, type: "png" });

    // 3. Step Badges during B-Roll segments (y=365)
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const p = path.join(workDir, `broll_badge_${i}.png`);
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0;width:1440px;height:2560px;background:transparent;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
            <div style="position:absolute;left:0;top:365px;width:1440px;display:flex;justify-content:center;">
              <div style="padding:10px 30px;background:#A3FF47;color:#0B0D13;font-size:32px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;border-radius:999px;box-shadow:0 6px 20px rgba(163,255,71,0.45);">
                ${seg.stepBadge}
              </div>
            </div>
          </body>
        </html>
      `);
      await page.screenshot({ path: p, omitBackground: true });
      badgePaths.push(p);
    }

    // 4. Torn-Paper Subtitles across the entire reel (y=2220 so they sit cleanly below the 1404..2188 Screen Studio recording)
    for (let i = 0; i < config.subtitleCues.length; i++) {
      const cue = config.subtitleCues[i]!;
      const p = path.join(workDir, `broll_sub_${i}.png`);
      const linesHtml = cue.lines
        .map(
          (l) => `
          <div style="display:inline-block;margin:4px 0;padding:12px 32px;background:#14161f;border:2.5px solid #A3FF47;clip-path:polygon(0% 8%, 5% 0%, 14% 6%, 24% 1%, 35% 5%, 48% 0%, 60% 6%, 72% 1%, 84% 5%, 94% 0%, 100% 4%, 99% 45%, 100% 92%, 94% 100%, 82% 94%, 68% 100%, 54% 95%, 40% 100%, 26% 94%, 12% 100%, 2% 95%, 0% 50%);color:#FFFFFF;font-size:38px;font-weight:900;font-style:italic;letter-spacing:0.8px;box-shadow:0 8px 20px rgba(0,0,0,0.85);">
            ${l}
          </div>
        `,
        )
        .join("<br/>");
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0;width:1440px;height:2560px;background:transparent;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;text-align:center;">
            <div style="position:absolute;left:0;top:2220px;width:1440px;display:flex;flex-direction:column;align-items:center;">
              <div>${linesHtml}</div>
            </div>
          </body>
        </html>
      `);
      await page.screenshot({ path: p, omitBackground: true });
      subPaths.push(p);
    }
  } finally {
    await browser.close();
  }

  // Build ffmpeg filter_complex:
  // Input 0: normARollFull (9:16 1440x2560 vertical Talking Head + continuous VO audio!)
  // Input 1: openingOverlayPath (shown 0 .. bRollStart)
  // Input 2: brollBgCanvasPath (shown bRollStart .. bRollEnd)
  // Input 3: normSSBottom (1356x784 Screen Studio UI recording at bottom (42, 1404) from bRollStart .. bRollEnd)
  // Input 4: normR1 (1318x744 Result Video 1 at top (61, 466) during result-1 segment)
  // Input 5: normR2 (1318x744 Result Video 2 at top (61, 466) during result-2 segment)
  // Input 6..6+segments.length-1: badge PNGs
  // Input 6+segments.length..: subtitle PNGs
  const hasR3 = Boolean(config.resultVideo3Path && existsSync(config.resultVideo3Path));
  const inputs: string[] = [
    "-i", normARollFull,
    "-loop", "1", "-i", openingOverlayPath,
    "-loop", "1", "-i", brollBgCanvasPath,
    "-i", normSSBottom,
    "-i", normR1,
    "-i", normR2,
    ...(hasR3 ? ["-i", normR3] : []),
  ];
  const baseBadgeOffset = hasR3 ? 7 : 6;
  for (const bp of badgePaths) {
    inputs.push("-loop", "1", "-i", bp);
  }
  for (const sp of subPaths) {
    inputs.push("-loop", "1", "-i", sp);
  }

  const filters: string[] = [];
  // 1. Opening 0..bRollStart: overlay opening header onto full-screen 9:16 A-Roll
  filters.push(
    `[0:v][1:v]overlay=0:0:enable='between(t,0,${bRollStart})'[v_open]`,
  );
  // 2. From bRollStart..bRollEnd: overlay B-Roll canvas + Bottom Screen Studio UI (42, 1404) + Top Result 1 default (61, 466)
  filters.push(
    `[v_open][2:v]overlay=0:0:enable='between(t,${bRollStart},${bRollEnd})'[v_bg]`,
  );
  filters.push(
    `[v_bg][3:v]overlay=42:1404:enable='between(t,${bRollStart},${bRollEnd})'[v_ss_bot]`,
  );
  filters.push(
    `[v_ss_bot][4:v]overlay=61:466:enable='between(t,${bRollStart},${bRollEnd})'[v_r1_top]`,
  );

  let prev = "[v_r1_top]";
  let stepCounter = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.source === "result-2") {
      const next = `[bseg_${stepCounter++}]`;
      filters.push(
        `${prev}[5:v]overlay=61:466:enable='between(t,${seg.start},${seg.end})'${next}`,
      );
      prev = next;
    } else if (seg.source === "result-3" && hasR3) {
      const next = `[bseg_${stepCounter++}]`;
      filters.push(
        `${prev}[6:v]overlay=61:466:enable='between(t,${seg.start},${seg.end})'${next}`,
      );
      prev = next;
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const badgeInputIdx = baseBadgeOffset + i;
    const next = `[bbadge_${stepCounter++}]`;
    filters.push(
      `${prev}[${badgeInputIdx}:v]overlay=0:0:enable='between(t,${seg.start},${seg.end})'${next}`,
    );
    prev = next;
  }

  for (let i = 0; i < config.subtitleCues.length; i++) {
    const cue = config.subtitleCues[i]!;
    const subInputIdx = baseBadgeOffset + segments.length + i;
    const isLast = i === config.subtitleCues.length - 1;
    const next = isLast ? "[vout]" : `[bsub_${stepCounter++}]`;
    filters.push(
      `${prev}[${subInputIdx}:v]overlay=0:0:enable='between(t,${cue.start},${cue.end})'${next}`,
    );
    prev = next;
  }

  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outReelPath = path.join(outDir, `${config.name} - Reel.mp4`);

  const comp = spawnSync(
    FFMPEG_BIN,
    [
      "-y",
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[vout]",
      "-map",
      "0:a",
      "-t",
      durSeconds.toFixed(2),
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outReelPath,
    ],
    { encoding: "utf8" },
  );
  if (comp.status !== 0) throw new Error(comp.stderr);
  return outReelPath;
}

/**
 * Full End-to-End B-Roll Tutorial Reel Harness:
 * 1. Generates (or loads) VERTICAL 9:16 A-Roll Talking Head explaining how to use Scro (ElevenLabs VO -> HeyGen Avatar IV 9:16 -> Color Fix)
 * 2. Records live Chrome tutorial session in Scro & exports 60fps via Screen Studio.app
 * 3. Composites B-Roll Reel:
 *    - First 2–3s: Full-screen 9:16 A-Roll Talking Head face
 *    - Remaining duration: A-Roll VO continues talking while B-Roll (Scro UI Screen Studio recording + Result Video 1 + Result Video 2) plays!
 * 4. Generates 9:16 2K Seedream 5.0 Pro Cover
 */
export async function runBRollReelHarness(config: BRollReelHarnessConfig) {
  // @ts-ignore
  const puppeteer = (await import("puppeteer")).default;
  const workDir = path.join(
    "/private/var/folders/8b/ldwp8b7x7klbv50l9qpz0jw40000gn/T/opencode/broll-reel",
    config.name.replace(/[^a-zA-Z0-9_-]/g, "_"),
  );
  mkdirSync(workDir, { recursive: true });

  console.log("[1/4] Preparing VERTICAL 9:16 A-Roll Talking Head video (ElevenLabs VO + HeyGen Avatar IV 9:16 + Color Fix)...");
  const aRollMp4Path = await ensureARollTalkingHeadVideo(config, workDir);
  const durationSeconds = probeVideoDurationSeconds(aRollMp4Path);

  console.log("[2/4] Recording live Chrome session in Scro & exporting 60fps via Screen Studio.app...");
  const screenStudioMp4Path = await recordLiveChromeAndExportScreenStudio(
    {
      name: config.name,
      feature: config.feature,
      videoId: config.videoId,
      topVideoPath: config.resultVideo1Path,
      durationSeconds,
      promptText: config.promptText,
      showExtendDialog: config.showExtendDialog,
      hookPrefix: config.hookPrefix,
      hookHighlight: config.hookHighlight,
      coverBadge: config.coverBadge,
      coverHeadline: config.coverHeadline,
      coverCenterPrompt: config.coverCenterPrompt,
      coverDramaticStylePrompt: config.coverDramaticStylePrompt,
      coverSceneImagePaths: config.coverSceneImagePaths,
      coverFooterLine1: "",
      coverFooterLine2: "",
      outDir: config.outDir,
    },
    workDir,
    durationSeconds,
    puppeteer,
  );

  console.log("[3/4] Compositing 1440x2560 Vertical A-Roll (0-2.8s) + B-Roll Cutaway Tutorial Reel...");
  const reelPath = await compositeBRollReel(
    config,
    aRollMp4Path,
    screenStudioMp4Path,
    workDir,
    puppeteer,
  );

  const startJpgPath = path.join(workDir, "aroll_start_9x16.jpg");
  const coverSceneImagePaths =
    config.coverSceneImagePaths && config.coverSceneImagePaths.length > 0
      ? config.coverSceneImagePaths
      : existsSync(startJpgPath)
        ? [startJpgPath]
        : undefined;

  console.log("[4/4] Generating 9:16 2K Reel Cover via Seedream 5.0 Pro...");
  const coverPath = await generateSeedreamReelCover({
    name: config.name,
    feature: config.feature,
    videoId: config.videoId,
    topVideoPath: config.resultVideo1Path,
    promptText: config.promptText,
    hookPrefix: config.hookPrefix,
    hookHighlight: config.hookHighlight,
    coverBadge: config.coverBadge,
    coverHeadline: config.coverHeadline,
    coverCenterPrompt: config.coverCenterPrompt,
    coverDramaticStylePrompt: config.coverDramaticStylePrompt,
    coverSceneImagePaths,
    coverFooterLine1: "",
    coverFooterLine2: "",
    outDir: config.outDir,
  });

  return { aRollMp4Path, screenStudioMp4Path, reelPath, coverPath };
}
