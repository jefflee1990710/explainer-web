import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";
import { applyJutsuColorGradeBuffer } from "@/service/jutsu/color-grade";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

loadEnvConfig(process.cwd());

export async function burnSubtitlesWithChromeAndColorFix(
  inMp4: string,
  outMp4: string,
  workDir: string,
  cues: Array<{ start: number; end: number; lines: string[] }>,
  puppeteer: any,
): Promise<number> {
  const normPath = path.join(workDir, "norm_1080p.mp4");
  const r = spawnSync(
    ffmpegPath!,
    [
      "-y",
      "-i",
      inMp4,
      "-vf",
      "scale=1920:1080,fps=24",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "17",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "44100",
      "-ac",
      "2",
      normPath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr);

  const dur = probeVideoDurationSeconds(normPath);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });

  const inputs: string[] = ["-i", normPath];
  const filterParts: string[] = [];
  let prev = "[0:v]";

  try {
    const page = await browser.newPage();
    for (let idx = 0; idx < cues.length; idx++) {
      const cue = cues[idx]!;
      const platePath = path.join(workDir, `sub_chrome_${idx}.png`);
      const linesHtml = cue.lines
        .map(
          (l) => `
          <div style="display:inline-block;margin:4px 0;padding:10px 28px;background:#14161f;border:2px solid rgba(163,255,71,0.55);clip-path:polygon(0% 8%, 5% 0%, 14% 6%, 24% 1%, 35% 5%, 48% 0%, 60% 6%, 72% 1%, 84% 5%, 94% 0%, 100% 4%, 99% 45%, 100% 92%, 94% 100%, 82% 94%, 68% 100%, 54% 95%, 40% 100%, 26% 94%, 12% 100%, 2% 95%, 0% 50%);color:#FFFFFF;font-size:34px;font-weight:900;font-style:italic;letter-spacing:0.8px;">
            ${l}
          </div>
        `,
        )
        .join("<br/>");

      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0;width:1920px;height:1080px;background:transparent;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding-bottom:72px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;text-align:center;">
            <div>${linesHtml}</div>
          </body>
        </html>
      `);
      await page.screenshot({ path: platePath, omitBackground: true });
      inputs.push("-i", platePath);
      const next = idx === cues.length - 1 ? "[vout]" : `[v${idx}]`;
      filterParts.push(
        `${prev}[${idx + 1}:v]overlay=0:0:enable='between(t,${cue.start},${cue.end})'${next}`,
      );
      prev = next;
    }
  } finally {
    await browser.close();
  }

  const subbedPath = path.join(workDir, "subbed.mp4");
  const burn = spawnSync(
    ffmpegPath!,
    [
      "-y",
      ...inputs,
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      "[vout]",
      "-map",
      "0:a",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "17",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      subbedPath,
    ],
    { encoding: "utf8" },
  );
  if (burn.status !== 0) throw new Error(burn.stderr);

  const gradedBuf = await applyJutsuColorGradeBuffer(readFileSync(subbedPath));
  writeFileSync(outMp4, gradedBuf);
  return dur;
}

export type SplitReelHarnessConfig = {
  /** Short slug/name used for output filenames and .screenstudio bundle */
  name: string;
  /** Feature route on scro.io ("explainer" | "swap" | "teleport" | "talking" | "story") */
  feature: "explainer" | "swap" | "teleport" | "talking" | "story";
  /** Optional MongoDB videos._id to open in the OpenCut editor */
  videoId?: string;
  /** Path to the finished top 16:9 video MP4 */
  topVideoPath: string;
  /** Duration in seconds of the reel (auto-probed from topVideoPath if omitted) */
  durationSeconds?: number;
  /** Prompt text typed live into the creation textarea */
  promptText: string;
  /** Whether to record clicking the "Extend +6s" button & dialog inside OpenCut */
  showExtendDialog?: boolean;
  /** White prefix of the middle hook title (e.g. "Generate Video with") */
  hookPrefix: string;
  /** Neon-lime (#A3FF47) highlighted part of the middle hook title (e.g. "Infinite Length") */
  hookHighlight: string;
  /** Top pill badge text on the 9:16 cover (e.g. "#SCRO TALKING") */
  coverBadge: string;
  /** Centered Torn-Paper (撕紙 style) headline on the 9:16 cover (e.g. "THE ADHD\nDOPAMINE RULE") */
  coverHeadline: string;
  /** Unique dramatic poster scene, lighting, and camera direction for the Seedream 5.0 Pro 9:16 cover */
  coverCenterPrompt: string;
  /** Optional dramatic lighting & lens override for the cover poster */
  coverDramaticStylePrompt?: string;
  /** Reference scene/character images (paths) for Seedream 5.0 Pro cover */
  coverSceneImagePaths?: string[];
  /** Bottom card line 1 (neon-lime) on the 9:16 cover */
  coverFooterLine1: string;
  /** Bottom card line 2 (white) on the 9:16 cover */
  coverFooterLine2: string;
  /** Output directory (defaults to Marketing/) */
  outDir?: string;
};

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG_BIN = ffmpegPath && existsSync(ffmpegPath) ? ffmpegPath : "ffmpeg";
const SCREEN_STUDIO_PROJECTS_DIR = "/Users/jefflee/Screen Studio Projects";
const SCREEN_STUDIO_TEMPLATE_BUNDLE = path.join(
  SCREEN_STUDIO_PROJECTS_DIR,
  "Area 2026-11-08 00:22:28.screenstudio",
);
const SCREEN_STUDIO_CLIPBOARD_DIR =
  "/var/folders/8b/ldwp8b7x7klbv50l9qpz0jw40000gn/T/Screen Studio/Clipboard Exports";

export function probeVideoDurationSeconds(filePath: string): number {
  const res = spawnSync(FFMPEG_BIN, ["-i", filePath], { encoding: "utf8" });
  const m = (res.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return 15.0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function mintSessionCookie(uid: string): Promise<string> {
  const customToken = await adminAuth().createCustomToken(uid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const signInRes = (await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  ).then((r) => r.json())) as { idToken: string };
  return adminAuth().createSessionCookie(signInRes.idToken, {
    expiresIn: 60 * 60 * 1000,
  });
}

async function dismissTourIfPresent(page: any) {
  try {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const skip = btns.find((b) => b.textContent?.trim() === "Skip");
      if (skip && skip instanceof HTMLElement) skip.click();
    });
  } catch {
    // Ignore context-destroyed errors during navigation
  }
}

/**
 * Step 1 & 2 Combined: Record a REAL continuous MP4 video of live Chrome interactions
 * at the exact targetDurationSeconds (24fps), along with synchronized mousemoves-0.json
 * & mouseclicks-0.json, then export 60fps MP4 via Screen Studio.app!
 */
export async function recordLiveChromeAndExportScreenStudio(
  config: SplitReelHarnessConfig,
  workDir: string,
  targetDurationSeconds: number,
  puppeteer: any,
): Promise<string> {
  const outBundle = path.join(
    SCREEN_STUDIO_PROJECTS_DIR,
    `${config.name}.screenstudio`,
  );
  rmSync(outBundle, { recursive: true, force: true });
  mkdirSync(path.join(outBundle, "recording"), { recursive: true });
  mkdirSync(path.join(outBundle, "data"), { recursive: true });
  cpSync(
    path.join(SCREEN_STUDIO_TEMPLATE_BUNDLE, "recording/cursors"),
    path.join(outBundle, "recording/cursors"),
    { recursive: true },
  );
  copyFileSync(
    path.join(SCREEN_STUDIO_TEMPLATE_BUNDLE, "recording/cursors.json"),
    path.join(outBundle, "recording/cursors.json"),
  );
  copyFileSync(
    path.join(SCREEN_STUDIO_TEMPLATE_BUNDLE, "meta.json"),
    path.join(outBundle, "meta.json"),
  );
  writeFileSync(path.join(outBundle, "recording-markers.json"), "[]\n");
  writeFileSync(path.join(outBundle, "recording/polyrecorder.log"), "");

  const uid = "9aCIBTWmoNaA5wQyGuxIKC8xP7Z2";
  const sessionCookie = await mintSessionCookie(uid);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--window-size=1680,1000",
      "--autoplay-policy=no-user-gesture-required",
    ],
    defaultViewport: { width: 1680, height: 1000, deviceScaleFactor: 1 },
  });

  const framesDir = path.join(workDir, "live_frames");
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const fps = 24;
  const totalTargetFrames = Math.max(240, Math.round(targetDurationSeconds * fps));
  const moves: any[] = [];
  const clicks: any[] = [];
  const zoomRanges: Array<{ startMs: number; endMs: number; zoom: number }> = [];
  const unixStartMs = Date.now();
  let frameIndex = 0;
  let curX = 640;
  let curY = 480;
  let curCursor: "arrow" | "iBeam" | "pointingHand" = "arrow";

  const currentMs = () => Math.round((frameIndex / fps) * 1000);

  let page: any;
  async function captureFrames(
    count: number,
    moveTarget?: { x: number; y: number; cursor?: "arrow" | "iBeam" | "pointingHand" },
  ) {
    const startX = curX;
    const startY = curY;
    for (let i = 0; i < count; i++) {
      const u = count <= 1 ? 1 : (i + 1) / count;
      const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      if (moveTarget) {
        curX = startX + (moveTarget.x - startX) * ease;
        curY = startY + (moveTarget.y - startY) * ease;
        if (u > 0.65 && moveTarget.cursor) curCursor = moveTarget.cursor;
      }
      const ms = currentMs();
      moves.push({
        activeModifiers: [],
        cursorId: curCursor,
        processTimeMs: ms,
        type: "mouseMoved",
        unixTimeMs: unixStartMs + ms,
        x: Number(curX.toFixed(2)),
        y: Number(curY.toFixed(2)),
      });
      const framePath = path.join(
        framesDir,
        `frame_${String(frameIndex).padStart(5, "0")}.jpg`,
      );
      await page.screenshot({ path: framePath, type: "jpeg", quality: 90 });
      frameIndex++;
    }
  }

  function recordClick() {
    const ms = currentMs();
    clicks.push({
      activeModifiers: [],
      button: "left",
      cursorId: curCursor,
      processTimeMs: ms,
      type: "mouseDown",
      unixTimeMs: unixStartMs + ms,
      x: Number(curX.toFixed(2)),
      y: Number(curY.toFixed(2)),
    });
    clicks.push({
      activeModifiers: [],
      button: "left",
      cursorId: curCursor,
      processTimeMs: ms + 90,
      type: "mouseUp",
      unixTimeMs: unixStartMs + ms + 90,
      x: Number(curX.toFixed(2)),
      y: Number(curY.toFixed(2)),
    });
  }

  try {
    page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      try {
        window.localStorage.setItem(
          "scro:opencut-editor-feature-discovery:dont-show:v1",
          "1",
        );
        window.localStorage.setItem(
          "scro:studio-nav-create-feature-discovery:seen:v1",
          "1",
        );
      } catch {
        // Ignore storage errors
      }
    });
    await page.setCookie({
      name: SESSION_COOKIE,
      value: sessionCookie,
      domain: "www.scro.io",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // 1. Open the feature creation studio directly (/app/stories, /app/talking-heads, /app/explainers, etc.)
    const featurePathMap: Record<SplitReelHarnessConfig["feature"], string> = {
      story: "/app/stories",
      talking: "/app/talking-heads",
      explainer: "/app/explainers",
      swap: "/app/scroswap",
      teleport: "/app/teleport",
    };
    const creationUrl = `https://www.scro.io${featurePathMap[config.feature] || "/app/stories"}`;
    await page.goto(creationUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2500));
    await dismissTourIfPresent(page);

    const creationBoxes = await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      const btns = Array.from(document.querySelectorAll("button"));
      const gen = btns.find((b) => /Generate/i.test(b.textContent || ""));
      const taRect = ta?.getBoundingClientRect();
      const genRect = gen?.getBoundingClientRect();
      return {
        hasTa: Boolean(taRect && taRect.width > 0),
        ta: taRect && taRect.width > 0
          ? { x: taRect.x + Math.min(180, taRect.width * 0.35), y: taRect.y + 42 }
          : { x: 680, y: 540 },
        gen: genRect && genRect.width > 0
          ? { x: genRect.x + genRect.width / 2, y: genRect.y + genRect.height / 2 }
          : { x: 915, y: 550 },
      };
    });

    // === BEAT 1 (~4.2s = 100 frames): Move to Prompt Textarea, click, type prompt live, click Generate ===
    const zoom1Start = currentMs();
    await captureFrames(16, {
      x: creationBoxes.ta.x,
      y: creationBoxes.ta.y,
      cursor: "iBeam",
    });
    recordClick();
    if (creationBoxes.hasTa) {
      await page.mouse.click(creationBoxes.ta.x, creationBoxes.ta.y).catch(() => {});
    }

    const totalChunks = 24;
    for (let c = 1; c <= totalChunks; c++) {
      const partial = config.promptText.slice(
        0,
        Math.round((config.promptText.length * c) / totalChunks),
      );
      await page
        .evaluate((txt: string) => {
          const ta = document.querySelector("textarea");
          if (ta) {
            ta.focus();
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              "value",
            )?.set;
            setter?.call(ta, txt);
            ta.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, partial)
        .catch(() => {});
      await captureFrames(2, {
        x: creationBoxes.ta.x + c * 3,
        y: creationBoxes.ta.y + 12,
        cursor: "iBeam",
      });
    }

    await captureFrames(20, {
      x: creationBoxes.gen.x,
      y: creationBoxes.gen.y,
      cursor: "pointingHand",
    });
    recordClick();
    await captureFrames(12);
    zoomRanges.push({ startMs: zoom1Start, endMs: currentMs(), zoom: 1.524 });

    // === BEAT 2: Navigate to /app/videos/<videoId> on the SAME page (preserving cookies) ===
    if (config.videoId) {
      await page.goto(`https://www.scro.io/app/videos/${config.videoId}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await new Promise((r) => setTimeout(r, 600));
      await dismissTourIfPresent(page);
      // Capture ~0.8s (20 frames) of loading state, then wait silently until fully loaded
      await captureFrames(18, { x: 840, y: 500, cursor: "arrow" });

      for (let i = 0; i < 30; i++) {
        await dismissTourIfPresent(page);
        const stillLoading = await page.evaluate(() =>
          document.body.innerText.includes("Loading video"),
        );
        if (!stillLoading) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      await new Promise((r) => setTimeout(r, 2500));
      await dismissTourIfPresent(page);

      // Inject our finished topVideoPath into the OpenCut preview container (covering any transform/selection guideline overlay)
      const videoB64 = readFileSync(config.topVideoPath).toString("base64");
      await page.evaluate((b64: string) => {
        // Hide OpenCut's TransformHandles (BoundingBoxOutline + CornerHandles + Rotate01Icon) and SnapGuides siblings next to [aria-label="Preview canvas"]
        const style = document.createElement("style");
        style.textContent = `
          [aria-label="Preview canvas"] ~ *,
          [data-testid*="transform"],
          [class*="transform-box"],
          [class*="selection-box"] {
            display: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);

        const target =
          document.querySelector("canvas") || document.querySelector("video");
        if (target && target.parentElement) {
          const parent = target.parentElement;
          parent.style.position = "relative";
          // Hide any sibling overlay divs (like the white bounding box + rotation handle) inside the preview stage
          Array.from(parent.children).forEach((child) => {
            if (child !== target && child instanceof HTMLElement) {
              child.style.display = "none";
            }
          });
          if (parent.parentElement) {
            Array.from(parent.parentElement.children).forEach((sibling) => {
              if (sibling !== parent && sibling instanceof HTMLElement && sibling.querySelector("svg, [style*='cursor']")) {
                sibling.style.display = "none";
              }
            });
          }
          const vid = document.createElement("video");
          vid.id = "__scro_live_preview";
          vid.src = `data:video/mp4;base64,${b64}`;
          vid.muted = true;
          vid.playsInline = true;
          vid.style.position = "absolute";
          vid.style.inset = "0";
          vid.style.width = "100%";
          vid.style.height = "100%";
          vid.style.objectFit = "contain";
          vid.style.background = "#090a0f";
          vid.style.pointerEvents = "none";
          vid.style.zIndex = "999";
          parent.appendChild(vid);
        }
      }, videoB64);

      let videoTime = 0;
      const stepVideoFrames = async (
        count: number,
        moveTarget?: { x: number; y: number; cursor?: "arrow" | "iBeam" | "pointingHand" },
      ) => {
        const startX = curX;
        const startY = curY;
        for (let i = 0; i < count; i++) {
          videoTime += 1 / fps;
          await page.evaluate((t: number) => {
            const v = document.getElementById(
              "__scro_live_preview",
            ) as HTMLVideoElement | null;
            if (v && Number.isFinite(v.duration) && v.duration > 0) {
              v.currentTime = t % Math.max(1, v.duration - 0.1);
            }
          }, videoTime);
          await captureFrames(
            1,
            moveTarget
              ? {
                  x: startX + ((moveTarget.x - startX) * (i + 1)) / count,
                  y: startY + ((moveTarget.y - startY) * (i + 1)) / count,
                  cursor: moveTarget.cursor,
                }
              : undefined,
          );
        }
      };

      if (config.showExtendDialog) {
        // Click Clip 1 on timeline or top bar "Extend +6s" button to open the real Extend Video dialog!
        await stepVideoFrames(12, { x: 460, y: 920, cursor: "pointingHand" });
        recordClick();
        await page.mouse.click(460, 920);
        await stepVideoFrames(10);

        const extendBtnBox = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll("button"));
          const ext = btns.find((b) => /Extend|延展/i.test(b.textContent || ""));
          if (!ext) return null;
          const r = ext.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });

        const zoom2Start = currentMs();
        if (extendBtnBox) {
          await stepVideoFrames(12, {
            x: extendBtnBox.x,
            y: extendBtnBox.y,
            cursor: "pointingHand",
          });
          recordClick();
          await page.mouse.click(extendBtnBox.x, extendBtnBox.y);
          await new Promise((r) => setTimeout(r, 500));

          const dlgBoxes = await page.evaluate(() => {
            const dlg = document.querySelector("[role=dialog]");
            const ta = dlg?.querySelector("textarea");
            const closeBtn = dlg?.querySelector("button[aria-label*='Close'], button[aria-label*='關閉']");
            const taRect = ta?.getBoundingClientRect();
            const closeRect = closeBtn?.getBoundingClientRect();
            return {
              ta: taRect ? { x: taRect.x + 120, y: taRect.y + 32 } : { x: 760, y: 340 },
              close: closeRect ? { x: closeRect.x + closeRect.width / 2, y: closeRect.y + closeRect.height / 2 } : { x: 1125, y: 175 },
            };
          });

          await stepVideoFrames(10, {
            x: dlgBoxes.ta.x,
            y: dlgBoxes.ta.y,
            cursor: "iBeam",
          });
          recordClick();
          const extPrompt = "Continue walking steadily forward down the sunlit watercolour cobblestone alleyway in one unbroken tracking shot.";
          for (let c = 1; c <= 12; c++) {
            const slice = extPrompt.slice(0, Math.round((extPrompt.length * c) / 12));
            await page.evaluate((txt: string) => {
              const ta = document.querySelector("[role=dialog] textarea") as HTMLTextAreaElement | null;
              if (ta) {
                const setter = Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype,
                  "value",
                )?.set;
                setter?.call(ta, txt);
                ta.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }, slice);
            await stepVideoFrames(2, {
              x: dlgBoxes.ta.x + c * 4,
              y: dlgBoxes.ta.y + 10,
              cursor: "iBeam",
            });
          }
          await stepVideoFrames(12, {
            x: dlgBoxes.close.x,
            y: dlgBoxes.close.y,
            cursor: "pointingHand",
          });
          recordClick();
          await page.mouse.click(dlgBoxes.close.x, dlgBoxes.close.y);
          await new Promise((r) => setTimeout(r, 350));
        }
        zoomRanges.push({ startMs: zoom2Start, endMs: currentMs(), zoom: 1.48 });
      }

      // Keep left rail on Assets (Media) — NEVER open the Subtitles modal — and play the video inside OpenCut!
      await page.evaluate(() => {
        const mediaRail = document.querySelector('[data-opencut-tour="rail-media"]') as HTMLElement | null;
        if (mediaRail) mediaRail.click();
      });

      // Hover and record visual click ripple without DOM-clicking timeline clips so OpenCut never draws the white canvas transform guideline!
      const postActions = [
        { x: 460, y: 920, cursor: "pointingHand" as const, click: true, zoom: true },
        { x: 965, y: 675, cursor: "pointingHand" as const, click: false, zoom: false },
        { x: 580, y: 920, cursor: "pointingHand" as const, click: true, zoom: false },
        { x: 740, y: 675, cursor: "arrow" as const, click: false, zoom: false },
        { x: 1495, y: 68, cursor: "pointingHand" as const, click: false, zoom: false },
      ];
      for (const act of postActions) {
        if (frameIndex >= totalTargetFrames) break;
        const moveLen = Math.min(12, totalTargetFrames - frameIndex);
        const zStart = currentMs();
        await stepVideoFrames(moveLen, { x: act.x, y: act.y, cursor: act.cursor });
        if (act.click) {
          recordClick();
        }
        const holdLen = Math.min(28, Math.max(0, totalTargetFrames - frameIndex));
        if (holdLen > 0) await stepVideoFrames(holdLen);
        if (act.zoom) {
          zoomRanges.push({ startMs: zStart, endMs: currentMs(), zoom: 1.42 });
        }
      }
      if (frameIndex < totalTargetFrames) {
        await stepVideoFrames(totalTargetFrames - frameIndex);
      }
    }
  } finally {
    await browser.close();
  }

  const rawMp4 = path.join(outBundle, "recording/channel-1-display-0.mp4");
  const enc = spawnSync(
    ffmpegPath!,
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(framesDir, "frame_%05d.jpg"),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "17",
      "-pix_fmt",
      "yuv420p",
      rawMp4,
    ],
    { encoding: "utf8" },
  );
  if (enc.status !== 0) throw new Error(enc.stderr);

  const recordedDurationMs = Math.round((frameIndex / fps) * 1000);

  writeFileSync(
    path.join(outBundle, "recording/mousemoves-0.json"),
    JSON.stringify(moves, null, 1),
  );
  writeFileSync(
    path.join(outBundle, "recording/mouseclicks-0.json"),
    JSON.stringify(clicks, null, 1),
  );
  writeFileSync(path.join(outBundle, "recording/keystrokes-0.json"), "[]\n");

  const metadata = {
    logFilename: "polyrecorder.log",
    polyrecorderVersion: "4.1.0-5005",
    recorders: [
      {
        configuration: {},
        cursorImagesFolder: "cursors",
        cursorsInfoFile: "cursors.json",
        id: "channel-0-cursor",
        type: "cursor",
      },
      {
        configuration: { captureKeyStrokes: true },
        id: "channel-0-input",
        sessions: [
          {
            durationMs: recordedDurationMs,
            keyStrokesFilename: "keystrokes-0.json",
            mouseClicksFilename: "mouseclicks-0.json",
            mouseMovesFilename: "mousemoves-0.json",
            processTimeEndMs: recordedDurationMs,
            processTimeStartMs: 0,
            unixEndMs: unixStartMs + recordedDurationMs,
            unixStartMs,
          },
        ],
        type: "input",
      },
      {
        configuration: {
          cropRect: {
            height: 1000,
            width: 1680,
            x: 0,
            y: 0,
            yAxis: "topBasedIncreasingDownwards",
          },
          displayId: 1,
          excludedWindowIds: [],
          excludeFinderDesktopIcons: false,
          videoCompressionSettings: { maxKeyFrameInterval: 240, quality: 0.85 },
        },
        id: "channel-1-display",
        sessions: [
          {
            bounds: { height: 1000, width: 1680, x: 0, y: 0 },
            displayRefreshRate: 60,
            durationMs: recordedDurationMs,
            outputFilename: "channel-1-display-0.mp4",
            processTimeEndMs: recordedDurationMs,
            processTimeStartMs: 0,
            recordingScale: 1,
            unixEndMs: unixStartMs + recordedDurationMs,
            unixStartMs,
          },
        ],
        type: "display",
      },
    ],
    sessions: [
      {
        durationMs: recordedDurationMs,
        processTimeEndMs: recordedDurationMs,
        processTimeStartMs: 0,
        unixEndMs: unixStartMs + recordedDurationMs,
        unixStartMs,
      },
    ],
    state: "complete",
  };
  writeFileSync(
    path.join(outBundle, "recording/metadata.json"),
    JSON.stringify(metadata, null, 2),
  );
  writeFileSync(
    path.join(outBundle, "recording/metadata-raw.json"),
    JSON.stringify(metadata, null, 2),
  );

  const templateRecJson = JSON.parse(
    readFileSync(
      path.join(SCREEN_STUDIO_TEMPLATE_BUNDLE, "recording/screen-studio-recording.json"),
      "utf8",
    ),
  );
  const appData = JSON.parse(templateRecJson.appData);
  appData.input.bounds = { x: 0, y: 0, width: 1680, height: 1000 };
  templateRecJson.appData = JSON.stringify(appData);
  writeFileSync(
    path.join(outBundle, "recording/screen-studio-recording.json"),
    JSON.stringify(templateRecJson, null, 2),
  );

  const projJson = JSON.parse(
    readFileSync(path.join(SCREEN_STUDIO_TEMPLATE_BUNDLE, "project.json"), "utf8"),
  );
  projJson.json.id = config.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "ScroReel";
  projJson.json.name = config.name;
  const loupe = {
    radius01: 0.35,
    bevelRatio: 0.2,
    chromaticAberration: 0.5,
    hasGlassOptics: true,
  };
  projJson.json.scenes[0].zooms = zoomRanges.map((z, idx) => ({
    id: `zoomAuto${idx + 1}`,
    sourceStartMs: z.startMs,
    sourceEndMs: z.endMs,
    zoom: z.zoom,
    type: "follow-click-groups",
    presentation: "screen",
    loupeOptions: loupe,
    manualTargetPoint: { x: 0.5, y: 0.5 },
    isDisabled: false,
    hasInstantAnimation: false,
  }));
  // Always use timeScale: 1 so Screen Studio exports the full recordedDurationMs (~targetDurationSeconds)!
  projJson.json.scenes[0].slices = [
    {
      id: "sliceMain01",
      timeScale: 1,
      sourceStartMs: 0,
      sourceEndMs: recordedDurationMs,
      volume: 1,
      systemAudioVolume: 1,
      externalDeviceAudioVolume: 1,
      hideCursor: false,
      disableSmoothMouseMovement: false,
    },
  ];
  projJson.json.data["last-playback-position-source-time-ms"] = 0;
  writeFileSync(path.join(outBundle, "project.json"), JSON.stringify(projJson, null, 2));
  writeFileSync(
    path.join(outBundle, "data/last-playback-position-source-time-ms.json"),
    JSON.stringify({ json: 0 }),
  );
  writeFileSync(
    path.join(outBundle, "data/recordingFlags.json"),
    JSON.stringify({ json: [] }),
  );

  spawnSync("killall", ["Screen Studio"]);
  await new Promise((r) => setTimeout(r, 1500));
  spawnSync("open", [
    "-a",
    "Screen Studio",
    outBundle,
    "--args",
    "--remote-debugging-port=9333",
  ]);
  await new Promise((r) => setTimeout(r, 5000));

  const ssBrowser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:9333",
    defaultViewport: null,
  });
  try {
    const pages = await ssBrowser.pages();
    for (const p of pages) {
      const hasProject = await p.evaluate(
        (name: string) => document.body?.innerText?.includes(name),
        config.name,
      );
      if (!hasProject) continue;

      const expBtn = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll("*")).filter(
          (el) => (el as HTMLElement).innerText?.trim() === "􀈃\nExport",
        );
        const t = els[els.length - 1];
        if (!t) return null;
        const r = t.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (expBtn) {
        await p.mouse.click(expBtn.x, expBtn.y);
        await new Promise((r) => setTimeout(r, 1200));
      }

      const clipOpt = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll("*")).filter(
          (el) =>
            (el as HTMLElement).innerText?.trim().endsWith("Clipboard") &&
            el.getBoundingClientRect().width < 150,
        );
        const t = els[els.length - 1];
        if (!t) return null;
        const r = t.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (clipOpt) {
        await p.mouse.click(clipOpt.x, clipOpt.y);
        await new Promise((r) => setTimeout(r, 500));
      }

      const startBtn = await p.evaluate(() => {
        const els = Array.from(document.querySelectorAll("*")).filter(
          (el) =>
            /Export to/i.test((el as HTMLElement).innerText?.trim() || "") &&
            el.getBoundingClientRect().width < 240 &&
            el.getBoundingClientRect().width > 80,
        );
        const t = els[els.length - 1];
        if (!t) return null;
        const r = t.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (startBtn) {
        await p.mouse.click(startBtn.x, startBtn.y);
      }

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const txt = await p.evaluate(() => document.body.innerText);
        if (i > 3 && !txt.includes("Stop export") && !txt.includes("Exporting video")) {
          break;
        }
      }
    }
  } finally {
    await ssBrowser.disconnect();
    spawnSync("killall", ["Screen Studio"]);
  }

  const exportedFiles = readdirSync(SCREEN_STUDIO_CLIPBOARD_DIR)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => {
      const full = path.join(SCREEN_STUDIO_CLIPBOARD_DIR, f);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!exportedFiles[0]) {
    throw new Error("Screen Studio export MP4 not found in Clipboard Exports");
  }
  return exportedFiles[0].full;
}

/**
 * Step 3: Render the 1440x2560 Split-Screen Reel MP4 locked to the full duration of topVideoPath.
 */
export async function compositeSplitScreenReel(
  config: SplitReelHarnessConfig,
  screenStudioMp4Path: string,
  workDir: string,
  puppeteer: any,
): Promise<string> {
  const durSeconds =
    config.durationSeconds ?? probeVideoDurationSeconds(config.topVideoPath);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,300"],
    defaultViewport: { width: 1440, height: 170, deviceScaleFactor: 1 },
  });

  let titleBuf: Buffer;
  try {
    const page = await browser.newPage();
    // Render large, high-visibility Torn Paper (撕紙 style) title banner with bright white fibrous torn outer rim + neon-lime highlight
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin:0;width:1440px;height:170px;background:#000000;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
          <div style="position:relative;display:inline-flex;align-items:center;justify-content:center;padding:7px 9px;background:#F5F7FA;clip-path:polygon(0% 10%, 3% 0%, 9% 7%, 16% 0%, 24% 6%, 33% 0%, 42% 6%, 51% 0%, 60% 6%, 69% 0%, 78% 6%, 87% 0%, 94% 6%, 100% 2%, 99% 35%, 100% 68%, 98% 94%, 93% 100%, 84% 94%, 75% 100%, 65% 93%, 54% 100%, 44% 94%, 35% 100%, 25% 93%, 15% 100%, 7% 94%, 1% 98%, 2% 62%, 0% 32%);filter:drop-shadow(0 0 24px rgba(163,255,71,0.42)) drop-shadow(0 10px 24px rgba(0,0,0,0.9));">
            <div style="padding:18px 46px;background:linear-gradient(180deg,#1B1F2E 0%,#10131C 100%);border:3px solid #A3FF47;clip-path:polygon(0% 8%, 4% 1%, 11% 6%, 19% 1%, 28% 5%, 37% 0%, 46% 5%, 55% 1%, 64% 5%, 73% 0%, 82% 5%, 91% 1%, 97% 5%, 100% 2%, 99% 36%, 100% 70%, 98% 95%, 93% 100%, 84% 95%, 75% 100%, 65% 94%, 54% 100%, 44% 95%, 35% 100%, 25% 94%, 15% 100%, 7% 95%, 1% 98%, 2% 62%, 0% 32%);">
              <div style="color:#FFFFFF;font-size:64px;line-height:1.08;font-weight:900;letter-spacing:0.5px;font-style:italic;text-transform:uppercase;text-shadow:0 4px 14px rgba(0,0,0,0.85);white-space:nowrap;">
                ${config.hookPrefix} <span style="color:#A3FF47;text-shadow:0 0 20px rgba(163,255,71,0.55);">${config.hookHighlight}</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    titleBuf = Buffer.from(await page.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }

  const logoBuf = await sharp(path.join(process.cwd(), "Marketing/logo-mark.png"))
    .resize(176, 176, { fit: "contain" })
    .png()
    .toBuffer();

  const bgCanvasPath = path.join(workDir, "reel_canvas.png");
  await sharp({
    create: {
      width: 1440,
      height: 2560,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: logoBuf, left: 632, top: 258 },
      { input: titleBuf, left: 0, top: 1248 },
    ])
    .png()
    .toFile(bgCanvasPath);

  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outReelPath = path.join(outDir, `${config.name} - Reel.mp4`);

  const comp = spawnSync(
    ffmpegPath!,
    [
      "-y",
      "-loop", "1", "-i", bgCanvasPath,
      "-i", config.topVideoPath,
      "-stream_loop", "-1", "-i", screenStudioMp4Path,
      "-filter_complex",
      "[1:v]scale=1318:744[topv];[2:v]scale=1356:814[botv];[0:v][topv]overlay=61:500[tmp1];[tmp1][botv]overlay=42:1422[vout]",
      "-map", "[vout]",
      "-map", "1:a",
      "-t", durSeconds.toFixed(2),
      "-r", "30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      outReelPath,
    ],
    { encoding: "utf8" },
  );
  if (comp.status !== 0) throw new Error(comp.stderr);
  return outReelPath;
}

export async function generateSeedreamReelCover(
  config: SplitReelHarnessConfig,
): Promise<string> {
  const logoPath = path.join(process.cwd(), "Marketing/logo-mark.png");
  const logoBuf = await sharp(logoPath)
    .resize(360, 360, { fit: "contain", background: { r: 18, g: 20, b: 28, alpha: 1 } })
    .jpeg({ quality: 90 })
    .toBuffer();
  const refs: string[] = [`data:image/jpeg;base64,${logoBuf.toString("base64")}`];

  for (const scenePath of config.coverSceneImagePaths || []) {
    if (existsSync(scenePath)) {
      const buf = await sharp(scenePath)
        .resize(640, 360, { fit: "cover" })
        .jpeg({ quality: 88 })
        .toBuffer();
      refs.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
    }
  }

  const headlineLines = config.coverHeadline
    .split("\n")
    .map((line) => `"${line.trim()}"`)
    .join(" / ");

  const dramaticDirection =
    config.coverDramaticStylePrompt ||
    "High-impact cinematic movie-poster lighting and camera work: dramatic chiaroscuro split lighting with glowing colored rim light and warm key spotlight cutting through subtle volumetric haze, dynamic low-angle 24mm/35mm wide-angle hero perspective with shallow depth-of-field bokeh and rich atmospheric contrast.";

  const prompt = [
    "Vertical 9:16 dramatic cinematic movie-poster Instagram Reel cover with consistent Scro brand styling and a unique, high-drama full-bleed visual composition.",
    `1) TOP BRAND HEADER: Centered near the top is the dark rounded-square app icon with the glowing neon-lime S logo mark (matching Reference Image 1), and directly underneath it is a bright neon-lime pill badge reading "${config.coverBadge}" in bold black condensed sans-serif.`,
    `2) DRAMATIC FULL-BLEED POSTER SCENE, LIGHTING & CAMERA: ${config.coverCenterPrompt}\n${dramaticDirection}`,
    `3) CENTER TORN-PAPER (撕紙 STYLE) TITLE BANNER (placed dead-center across the middle of the 9:16 poster): Right across the center of the composition, render a tactile hand-torn paper collage title banner (撕紙毛邊效果: layered charcoal-black and warm cream/neon-lime torn cardstock strips with rough white fibrous deckle edges and deep drop shadow) reading in giant ultra-bold condensed uppercase letters: ${headlineLines}.`,
    "4) CLEAN UNOBSTRUCTED BOTTOM (NO BOTTOM BOX): Do NOT draw any rectangular box, card, border frame, or banner at the bottom of the poster. Let the dramatic cinematic scene and subject bleed cleanly all the way to the bottom edge.",
    "Ultra-crisp theatrical poster photography, tactile torn-paper collage edges in the center title, razor-sharp typography, zero bottom box.",
  ].join("\n\n");

  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "9:16",
    resolution: "2k",
    referenceImageUrls: refs,
  });

  const url = res.images?.[0]?.url;
  if (!url) throw new Error("Seedream 5.0 Pro returned no cover image");
  const base64Data = url.replace(/^data:image\/\w+;base64,/, "");
  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outCoverPath = path.join(outDir, `${config.name} - Cover.png`);
  writeFileSync(outCoverPath, Buffer.from(base64Data, "base64"));
  return outCoverPath;
}

export async function compositeSwapComparisonSplitReel(input: {
  name: string;
  originalVideoPath: string;
  swappedVideoPath: string;
  screenStudioMp4Path: string;
  audioPath?: string;
  durationSeconds: number;
  hookPrefix: string;
  hookHighlight: string;
  workDir: string;
  outDir?: string;
  puppeteer: any;
}): Promise<string> {
  const browser = await input.puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,2560"],
    defaultViewport: { width: 1440, height: 2560, deviceScaleFactor: 1 },
  });

  const overlayPngPath = path.join(input.workDir, "swap_overlay.png");
  try {
    const page = await browser.newPage();
    const logoB64 = readFileSync(
      path.join(process.cwd(), "Marketing/logo-mark.png"),
    ).toString("base64");
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin:0;width:1440px;height:2560px;background:transparent;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
          <img src="data:image/png;base64,${logoB64}" style="position:absolute;left:632px;top:48px;width:176px;height:176px;object-fit:contain;" />
          <div style="position:absolute;left:490px;top:302px;padding:6px 18px;background:rgba(15,17,24,0.82);border:2px solid rgba(255,255,255,0.45);clip-path:polygon(0% 10%, 8% 0%, 92% 4%, 100% 0%, 98% 92%, 90% 100%, 8% 95%, 0% 100%);color:#FFFFFF;font-size:32px;font-weight:900;letter-spacing:1px;">
            ORIGINAL
          </div>
          <div style="position:absolute;left:1215px;top:302px;padding:6px 20px;background:rgba(15,17,24,0.88);border:2px solid #A3FF47;clip-path:polygon(0% 10%, 8% 0%, 92% 4%, 100% 0%, 98% 92%, 90% 100%, 8% 95%, 0% 100%);color:#A3FF47;font-size:32px;font-weight:900;letter-spacing:1px;">
            SWAP
          </div>
          <div style="position:absolute;left:0;top:1460px;width:1440px;display:flex;justify-content:center;">
            <div style="padding:14px 36px;background:#151722;border:2px solid rgba(163,255,71,0.55);clip-path:polygon(0% 8%, 4% 0%, 12% 6%, 22% 1%, 34% 5%, 46% 0%, 58% 6%, 70% 1%, 82% 5%, 93% 0%, 100% 4%, 99% 48%, 100% 94%, 92% 100%, 80% 95%, 66% 100%, 52% 94%, 38% 100%, 24% 95%, 10% 100%, 2% 94%, 0% 50%);color:#FFFFFF;font-size:48px;font-weight:900;font-style:italic;letter-spacing:0.5px;">
              ${input.hookPrefix} <span style="color:#A3FF47;">${input.hookHighlight}</span> NOW
            </div>
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: overlayPngPath, omitBackground: true });
  } finally {
    await browser.close();
  }

  const outDir = input.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outReelPath = path.join(outDir, `${input.name} - Reel.mp4`);
  const durStr = input.durationSeconds.toFixed(2);
  const fadeStart = Math.max(0, input.durationSeconds - 1.5).toFixed(2);
  const audioFile =
    input.audioPath ||
    path.join(process.cwd(), "Marketing/Scro Reel - Swap/Scro Reel - Swap.MP3");

  const comp = spawnSync(
    ffmpegPath!,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=1440x2560:r=30:d=${durStr}`,
      "-i",
      input.originalVideoPath,
      "-i",
      input.swappedVideoPath,
      "-stream_loop",
      "-1",
      "-i",
      input.screenStudioMp4Path,
      "-loop",
      "1",
      "-i",
      overlayPngPath,
      "-i",
      audioFile,
      "-filter_complex",
      `[3:v]scale=1356:814[botv];[0:v][1:v]overlay=62:278[t1];[t1][2:v]overlay=730:278[t2];[t2][botv]overlay=42:1612[t3];[t3][4:v]overlay=0:0[vout];[5:a]volume=0.9,afade=t=out:st=${fadeStart}:d=1.5[aout]`,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-t",
      durStr,
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

export async function runSplitReelHarness(config: SplitReelHarnessConfig) {
  // @ts-ignore
  const puppeteer = (await import("puppeteer")).default;
  const workDir = path.join(
    "/private/var/folders/8b/ldwp8b7x7klbv50l9qpz0jw40000gn/T/opencode/split-reel",
    config.name.replace(/[^a-zA-Z0-9_-]/g, "_"),
  );
  mkdirSync(workDir, { recursive: true });

  const durationSeconds =
    config.durationSeconds ?? probeVideoDurationSeconds(config.topVideoPath);

  console.log("[1/3] Recording real live Chrome session & exporting 60fps via Screen Studio.app...");
  const screenStudioMp4Path = await recordLiveChromeAndExportScreenStudio(
    config,
    workDir,
    durationSeconds,
    puppeteer,
  );

  console.log("[2/3] Compositing 1440x2560 Split-Screen Reel...");
  const reelPath = await compositeSplitScreenReel(
    config,
    screenStudioMp4Path,
    workDir,
    puppeteer,
  );

  console.log("[3/3] Generating 9:16 2K Reel Cover via Seedream 5.0 Pro...");
  const coverPath = await generateSeedreamReelCover(config);

  return { reelPath, coverPath, screenStudioMp4Path };
}
