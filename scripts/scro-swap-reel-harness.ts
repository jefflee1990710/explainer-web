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
import { ObjectId } from "mongodb";
import sharp from "sharp";
import { jutsuJobsCollection, videosCollection } from "@/dao";
import { adminAuth } from "@/service/firebase/admin";
import { SESSION_COOKIE } from "@/service/firebase/session";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import { probeVideoDurationSeconds } from "./scro-split-reel-harness";

loadEnvConfig(process.cwd());

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG_BIN = ffmpegPath && existsSync(ffmpegPath) ? ffmpegPath : "ffmpeg";
const SCREEN_STUDIO_PROJECTS_DIR = "/Users/jefflee/Screen Studio Projects";
const SCREEN_STUDIO_TEMPLATE_BUNDLE = path.join(
  SCREEN_STUDIO_PROJECTS_DIR,
  "Area 2026-11-08 00:22:28.screenstudio",
);
const SCREEN_STUDIO_CLIPBOARD_DIR =
  "/var/folders/8b/ldwp8b7x7klbv50l9qpz0jw40000gn/T/Screen Studio/Clipboard Exports";

export type SwapSplitReelHarnessConfig = {
  /** Output filename base (writes `Marketing/<name> - Reel.mp4` and `Marketing/<name> - Cover.png`) */
  name: string;
  /** MongoDB `videos._id` of the Scro Swap video (e.g. "6af164fd0fbcc24617fdd7d6") */
  videoId: string;
  /** Optional local path to the original source video (if omitted, downloaded from `jutsu_jobs.sourceVideoUrl`) */
  sourceVideoPath?: string;
  /** Optional local path to the swapped output video (if omitted, downloaded from `videos.clips[0].outputUrl`) */
  swappedVideoPath?: string;
  /** Optional timestamp (seconds) to extract keyframe pair from source & swapped videos for the 9:16 Cover */
  coverSampleTimeSeconds?: number;
  /** Hook title prefix (default: "CREATE YOUR") */
  hookPrefix?: string;
  /** Hook title neon-lime highlight (default: "CHARACTER SWAP") */
  hookHighlight?: string;
  /** Hook title suffix (default: "NOW") */
  hookSuffix?: string;
  /** Cover headline line 1 (default: "CHARACTER SWAP") */
  coverHeadlineLine1?: string;
  /** Cover headline line 2 (default: "SWAP ANY MOTION IN 1 CLICK") */
  coverHeadlineLine2?: string;
  /** Optional custom description of the left/right subjects for the Seedream 5.0 Pro Cover */
  coverSceneDescription?: string;
  /** Output directory (defaults to `Marketing/`) */
  outDir?: string;
};

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

async function suppressToursAndGuidelines(page: any) {
  try {
    await page.evaluate(() => {
      try {
        window.localStorage.setItem("scro:studio-nav-create-feature-discovery:seen:v1", "1");
        window.localStorage.setItem("scro:create-video-feature-discovery:dont-show:v1", "1");
        window.localStorage.setItem("scro:opencut-editor-feature-discovery:dont-show:v1", "1");
      } catch {}
      let style = document.getElementById("__scro_hide_swap_guides");
      if (!style) {
        style = document.createElement("style");
        style.id = "__scro_hide_swap_guides";
        style.textContent = `
          .z-\\[260\\][role="dialog"],
          [aria-label="Preview canvas"] ~ *,
          [data-testid*="transform"],
          [class*="transform-box"],
          [class*="selection-box"] {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(style);
      }
      const btns = Array.from(document.querySelectorAll("button"));
      const skip = btns.find(
        (b) => b.textContent?.trim() === "Skip" || b.textContent?.trim() === "跳過導覽",
      );
      if (skip && skip instanceof HTMLElement) skip.click();
    });
  } catch {}
}

/**
 * Record a 60fps Screen Studio session for `/app/scroswap` -> `/app/videos/<videoId>`
 */
export async function recordSwapChromeAndExportScreenStudio(
  config: SwapSplitReelHarnessConfig,
  sourceVideoPath: string,
  swappedVideoPath: string,
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

  const sessionCookie = await mintSessionCookie("9aCIBTWmoNaA5wQyGuxIKC8xP7Z2");
  const framesDir = path.join(workDir, "live_frames_swap");
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

  // Extract a thumbnail of sourceVideoPath to inject into the `/app/scroswap` upload card
  const srcThumbPath = path.join(workDir, "src_thumb_ui.jpg");
  spawnSync(
    FFMPEG_BIN,
    ["-y", "-ss", "3.5", "-i", sourceVideoPath, "-frames:v", "1", "-q:v", "3", srcThumbPath],
    { encoding: "utf8" },
  );
  const srcThumbB64 = existsSync(srcThumbPath)
    ? `data:image/jpeg;base64,${readFileSync(srcThumbPath).toString("base64")}`
    : "";

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

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      try {
        window.localStorage.setItem("scro:studio-nav-create-feature-discovery:seen:v1", "1");
        window.localStorage.setItem("scro:create-video-feature-discovery:dont-show:v1", "1");
        window.localStorage.setItem("scro:opencut-editor-feature-discovery:dont-show:v1", "1");
      } catch {}
    });
    await page.setCookie({
      name: SESSION_COOKIE,
      value: sessionCookie,
      domain: "www.scro.io",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    async function captureFrames(
      count: number,
      moveTarget?: { x: number; y: number; cursor?: "arrow" | "iBeam" | "pointingHand" },
    ) {
      const startX = curX;
      const startY = curY;
      for (let i = 0; i < count; i++) {
        await suppressToursAndGuidelines(page);
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

    // === BEAT 1: Open `/app/scroswap` (~4.2s = 100 frames) ===
    await page.goto("https://www.scro.io/app/scroswap", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2400));
    await suppressToursAndGuidelines(page);

    const swapBoxes = await page.evaluate((thumbSrc: string) => {
      const btns = Array.from(document.querySelectorAll("button"));
      const gen = btns.find((b) => /Generate/i.test(b.textContent || ""));
      const genRect = gen?.getBoundingClientRect();
      // Inject source video thumbnail into the upload dropzone so the UI looks populated
      const dropzone = Array.from(document.querySelectorAll("div")).find(
        (d) =>
          /Drop Source Video|上傳來源影片/i.test(d.textContent || "") &&
          d.getBoundingClientRect().width > 200 &&
          d.getBoundingClientRect().width < 520,
      );
      if (dropzone && thumbSrc) {
        const r = dropzone.getBoundingClientRect();
        dropzone.style.position = "relative";
        dropzone.style.overflow = "hidden";
        const img = document.createElement("img");
        img.src = thumbSrc;
        img.style.position = "absolute";
        img.style.inset = "0";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "14px";
        dropzone.appendChild(img);
        return {
          drop: { x: r.x + r.width / 2, y: r.y + r.height / 2 },
          char: { x: r.x + r.width + 130, y: r.y + r.height / 2 },
          gen: genRect
            ? { x: genRect.x + genRect.width / 2, y: genRect.y + genRect.height / 2 }
            : { x: 1125, y: 690 },
        };
      }
      return {
        drop: { x: 640, y: 690 },
        char: { x: 945, y: 690 },
        gen: genRect
          ? { x: genRect.x + genRect.width / 2, y: genRect.y + genRect.height / 2 }
          : { x: 1125, y: 690 },
      };
    }, srcThumbB64);

    const z1Start = currentMs();
    await captureFrames(20, {
      x: swapBoxes.drop.x,
      y: swapBoxes.drop.y,
      cursor: "pointingHand",
    });
    recordClick();
    await captureFrames(22, {
      x: swapBoxes.char.x,
      y: swapBoxes.char.y,
      cursor: "pointingHand",
    });
    recordClick();
    await captureFrames(22, {
      x: swapBoxes.gen.x,
      y: swapBoxes.gen.y,
      cursor: "pointingHand",
    });
    recordClick();
    await captureFrames(14);
    zoomRanges.push({ startMs: z1Start, endMs: currentMs(), zoom: 1.52 });

    // === BEAT 2: Open `/app/videos/<videoId>` and play the swapped 9:16 video cleanly inside OpenCut ===
    await page.goto(`https://www.scro.io/app/videos/${config.videoId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 600));
    await suppressToursAndGuidelines(page);
    await captureFrames(16, { x: 840, y: 500, cursor: "arrow" });

    for (let i = 0; i < 30; i++) {
      await suppressToursAndGuidelines(page);
      const stillLoading = await page.evaluate(() =>
        document.body.innerText.includes("Loading video"),
      );
      if (!stillLoading) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    await new Promise((r) => setTimeout(r, 2200));
    await suppressToursAndGuidelines(page);

    const videoB64 = readFileSync(swappedVideoPath).toString("base64");
    await page.evaluate((b64: string) => {
      const target =
        document.querySelector("canvas") || document.querySelector("video");
      if (target && target.parentElement) {
        const parent = target.parentElement;
        parent.style.position = "relative";
        Array.from(parent.children).forEach((child) => {
          if (child !== target && child instanceof HTMLElement) {
            child.style.display = "none";
          }
        });
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

    let videoTime = 2.0; // Start preview at 2.0s so the aerial kick action is immediately visible inside OpenCut!
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

    const postActions = [
      { x: 460, y: 920, cursor: "pointingHand" as const, click: true, zoom: true },
      { x: 740, y: 520, cursor: "arrow" as const, click: false, zoom: true },
      { x: 580, y: 920, cursor: "pointingHand" as const, click: true, zoom: false },
      { x: 1495, y: 68, cursor: "pointingHand" as const, click: false, zoom: false },
    ];
    for (const act of postActions) {
      if (frameIndex >= totalTargetFrames) break;
      const moveLen = Math.min(14, totalTargetFrames - frameIndex);
      const zStart = currentMs();
      await stepVideoFrames(moveLen, { x: act.x, y: act.y, cursor: act.cursor });
      if (act.click) recordClick();
      const holdLen = Math.min(36, Math.max(0, totalTargetFrames - frameIndex));
      if (holdLen > 0) await stepVideoFrames(holdLen);
      if (act.zoom) {
        zoomRanges.push({ startMs: zStart, endMs: currentMs(), zoom: 1.44 });
      }
    }
    if (frameIndex < totalTargetFrames) {
      await stepVideoFrames(totalTargetFrames - frameIndex);
    }
  } finally {
    await browser.close();
  }

  const rawMp4 = path.join(outBundle, "recording/channel-1-display-0.mp4");
  const enc = spawnSync(
    FFMPEG_BIN,
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
  writeFileSync(path.join(outBundle, "recording/mousemoves-0.json"), JSON.stringify(moves, null, 1));
  writeFileSync(path.join(outBundle, "recording/mouseclicks-0.json"), JSON.stringify(clicks, null, 1));
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
  writeFileSync(path.join(outBundle, "recording/metadata.json"), JSON.stringify(metadata, null, 2));
  writeFileSync(path.join(outBundle, "recording/metadata-raw.json"), JSON.stringify(metadata, null, 2));

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
  projJson.json.id = config.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "ScroSwapReel";
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

  const beforeFiles = new Set(
    existsSync(SCREEN_STUDIO_CLIPBOARD_DIR) ? readdirSync(SCREEN_STUDIO_CLIPBOARD_DIR) : [],
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
  await new Promise((r) => setTimeout(r, 5500));

  let exportedMp4 = "";
  const ssBrowser = await puppeteer
    .connect({ browserURL: "http://127.0.0.1:9333", defaultViewport: null })
    .catch(() => null);
  if (ssBrowser) {
    try {
      const pages = await ssBrowser.pages();
      for (const p of pages) {
        const hasProject = await p
          .evaluate((name: string) => document.body?.innerText?.includes(name), config.name)
          .catch(() => false);
        if (!hasProject) continue;

        const expBtn = await p
          .evaluate(() => {
            const els = Array.from(document.querySelectorAll("*")).filter(
              (el) => (el as HTMLElement).innerText?.trim() === "􀈃\nExport",
            );
            const t = els[els.length - 1];
            if (!t) return null;
            const r = t.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          })
          .catch(() => null);
        if (expBtn) {
          await p.mouse.click(expBtn.x, expBtn.y);
          await new Promise((r) => setTimeout(r, 1200));
        }

        const clipOpt = await p
          .evaluate(() => {
            const els = Array.from(document.querySelectorAll("*")).filter(
              (el) =>
                (el as HTMLElement).innerText?.trim().endsWith("Clipboard") &&
                el.getBoundingClientRect().width < 150,
            );
            const t = els[els.length - 1];
            if (!t) return null;
            const r = t.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          })
          .catch(() => null);
        if (clipOpt) {
          await p.mouse.click(clipOpt.x, clipOpt.y);
          await new Promise((r) => setTimeout(r, 500));
        }

        const startBtn = await p
          .evaluate(() => {
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
          })
          .catch(() => null);
        if (startBtn) {
          await p.mouse.click(startBtn.x, startBtn.y);
        }

        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const cur = readdirSync(SCREEN_STUDIO_CLIPBOARD_DIR).filter(
            (f) => f.endsWith(".mp4") && !beforeFiles.has(f),
          );
          if (cur.length > 0) {
            const full = path.join(SCREEN_STUDIO_CLIPBOARD_DIR, cur[0]!);
            const sz1 = statSync(full).size;
            await new Promise((r) => setTimeout(r, 1200));
            const sz2 = statSync(full).size;
            if (sz2 > 500_000 && sz1 === sz2) {
              exportedMp4 = full;
              break;
            }
          }
        }
      }
    } finally {
      await ssBrowser.disconnect();
      spawnSync("killall", ["Screen Studio"]);
    }
  }
  return exportedMp4 || rawMp4;
}

/**
 * Composite the 1440x2560 Swap Split-Screen Reel (matching https://www.instagram.com/p/DfZ_hoVxyRK/):
 * - Top Left (42, 260, 672x990): ORIGINAL source video + ORIGINAL badge
 * - Top Right (726, 260, 672x990): SWAP output video + SWAP neon-lime badge
 * - Middle (y = 1280): Torn-Paper Hook Title ("CREATE YOUR CHARACTER SWAP NOW")
 * - Bottom (42, 1422, 1356x814): Native 60fps Screen Studio recording of Scro Swap
 */
export async function compositeSwapSplitReel(
  config: SwapSplitReelHarnessConfig,
  sourceVideoPath: string,
  swappedVideoPath: string,
  screenStudioMp4Path: string,
  workDir: string,
  durationSeconds: number,
  puppeteer: any,
): Promise<string> {
  const normSrc = path.join(workDir, "norm_src_672x990.mp4");
  const normOut = path.join(workDir, "norm_out_672x990.mp4");
  const normSS = path.join(workDir, "norm_ss_1356x814.mp4");

  spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-stream_loop", "-1", "-i", sourceVideoPath,
      "-t", durationSeconds.toFixed(2),
      "-vf", "scale=672:990:force_original_aspect_ratio=increase,crop=672:990,fps=24",
      "-an",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
      normSrc,
    ],
    { encoding: "utf8" },
  );

  spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-stream_loop", "-1", "-i", swappedVideoPath,
      "-t", durationSeconds.toFixed(2),
      "-vf", "scale=672:990:force_original_aspect_ratio=increase,crop=672:990,fps=24",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "44100", "-ac", "2",
      normOut,
    ],
    { encoding: "utf8" },
  );

  spawnSync(
    FFMPEG_BIN,
    [
      "-y", "-stream_loop", "-1", "-i", screenStudioMp4Path,
      "-t", durationSeconds.toFixed(2),
      "-vf", "scale=1356:814:force_original_aspect_ratio=decrease,pad=1356:814:(ow-iw)/2:(oh-ih)/2,fps=24",
      "-an",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p",
      normSS,
    ],
    { encoding: "utf8" },
  );

  // Render transparent 1440x2560 overlay PNG (Top S Logo + ORIGINAL / SWAP Torn-Paper badges + Middle Torn-Paper Hook Title)
  const overlayPng = path.join(workDir, "swap_split_overlay.png");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,2560"],
    defaultViewport: { width: 1440, height: 2560, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    const logoB64 = readFileSync(path.join(process.cwd(), "Marketing/logo-mark.png")).toString("base64");
    const prefix = config.hookPrefix ?? "CREATE YOUR";
    const highlight = config.hookHighlight ?? "CHARACTER SWAP";
    const suffix = config.hookSuffix ?? "NOW";

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin:0;width:1440px;height:2560px;background:transparent;position:relative;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
          <!-- Top S Logo -->
          <img src="data:image/png;base64,${logoB64}" style="position:absolute;left:638px;top:52px;width:164px;height:164px;object-fit:contain;" />

          <!-- ORIGINAL badge at top-right of Left Panel (x=42..714, y=260..1250) -->
          <div style="position:absolute;left:490px;top:284px;padding:8px 24px;background:#181B24;border:2px solid rgba(255,255,255,0.45);clip-path:polygon(0% 10%, 6% 0%, 18% 7%, 34% 0%, 52% 6%, 70% 0%, 88% 6%, 100% 2%, 98% 92%, 86% 100%, 68% 93%, 48% 100%, 28% 94%, 10% 100%, 2% 90%);color:#FFFFFF;font-size:28px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;box-shadow:0 6px 18px rgba(0,0,0,0.75);">
            ORIGINAL
          </div>

          <!-- SWAP badge at top-right of Right Panel (x=726..1398, y=260..1250) -->
          <div style="position:absolute;left:1214px;top:284px;padding:8px 26px;background:#14181F;border:2.5px solid #A3FF47;clip-path:polygon(0% 10%, 6% 0%, 18% 7%, 34% 0%, 52% 6%, 70% 0%, 88% 6%, 100% 2%, 98% 92%, 86% 100%, 68% 93%, 48% 100%, 28% 94%, 10% 100%, 2% 90%);color:#A3FF47;font-size:28px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;box-shadow:0 6px 18px rgba(0,0,0,0.75);">
            SWAP
          </div>

          <!-- Middle Torn-Paper Hook Title (y=1280) -->
          <div style="position:absolute;left:0;top:1278px;width:1440px;height:125px;display:flex;align-items:center;justify-content:center;">
            <div style="padding:16px 44px;background:linear-gradient(180deg,#1B1F2E 0%,#10131C 100%);border:3px solid #A3FF47;clip-path:polygon(0% 8%, 4% 1%, 11% 6%, 19% 1%, 28% 5%, 37% 0%, 46% 5%, 55% 1%, 64% 5%, 73% 0%, 82% 5%, 91% 1%, 97% 5%, 100% 2%, 99% 36%, 100% 70%, 98% 95%, 93% 100%, 84% 95%, 75% 100%, 65% 94%, 54% 100%, 44% 95%, 35% 100%, 25% 94%, 15% 100%, 7% 95%, 1% 98%, 2% 62%, 0% 32%);filter:drop-shadow(0 0 20px rgba(163,255,71,0.38)) drop-shadow(0 8px 20px rgba(0,0,0,0.85));">
              <div style="color:#FFFFFF;font-size:48px;line-height:1.08;font-weight:900;letter-spacing:0.6px;font-style:italic;text-transform:uppercase;white-space:nowrap;">
                ${prefix} <span style="color:#A3FF47;">${highlight}</span> ${suffix}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: overlayPng, omitBackground: true });
  } finally {
    await browser.close();
  }

  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outReelPath = path.join(outDir, `${config.name} - Reel.mp4`);

  const comp = spawnSync(
    FFMPEG_BIN,
    [
      "-y",
      "-f", "lavfi", "-i", `color=c=black:s=1440x2560:r=24:d=${durationSeconds.toFixed(2)}`,
      "-i", normSrc,
      "-i", normOut,
      "-i", normSS,
      "-loop", "1", "-i", overlayPng,
      "-filter_complex",
      "[0:v][1:v]overlay=42:260[v1];[v1][2:v]overlay=726:260[v2];[v2][3:v]overlay=42:1422[v3];[v3][4:v]overlay=0:0[vout]",
      "-map", "[vout]",
      "-map", "2:a?",
      "-t", durationSeconds.toFixed(2),
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      outReelPath,
    ],
    { encoding: "utf8" },
  );
  if (comp.status !== 0) throw new Error(comp.stderr);
  return outReelPath;
}

/**
 * Generate the 9:16 2K Seedream 5.0 Pro Cover for a Swap Split Reel (matching https://www.instagram.com/p/DfZ_hoVxyRK/):
 * - Extracts the action keyframe at `coverSampleTimeSeconds` from both `sourceVideoPath` (left) and `swappedVideoPath` (right)
 * - Stitches a side-by-side reference image and passes it + `Marketing/logo-mark.png` to Seedream 5.0 Pro
 */
export async function generateSwapSplitReelCover(
  config: SwapSplitReelHarnessConfig,
  sourceVideoPath: string,
  swappedVideoPath: string,
  workDir: string,
): Promise<string> {
  const sampleT = config.coverSampleTimeSeconds ?? 9.2;
  const srcFramePath = path.join(workDir, "cover_src_frame.jpg");
  const outFramePath = path.join(workDir, "cover_out_frame.jpg");

  spawnSync(
    FFMPEG_BIN,
    ["-y", "-ss", String(sampleT), "-i", sourceVideoPath, "-frames:v", "1", "-q:v", "2", srcFramePath],
    { encoding: "utf8" },
  );
  spawnSync(
    FFMPEG_BIN,
    ["-y", "-ss", String(sampleT), "-i", swappedVideoPath, "-frames:v", "1", "-q:v", "2", outFramePath],
    { encoding: "utf8" },
  );

  // Stitch side-by-side 1152x2048 reference image (Left = Original, Right = Swapped)
  const leftBuf = await sharp(readFileSync(srcFramePath))
    .resize(576, 2048, { fit: "cover" })
    .png()
    .toBuffer();
  const rightBuf = await sharp(readFileSync(outFramePath))
    .resize(576, 2048, { fit: "cover" })
    .png()
    .toBuffer();
  const pairBuf = await sharp({
    create: { width: 1152, height: 2048, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite([
      { input: leftBuf, left: 0, top: 0 },
      { input: rightBuf, left: 576, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
  const pairPath = path.join(workDir, "cover_pair_ref.jpg");
  writeFileSync(pairPath, pairBuf);

  const logoB64 = `data:image/png;base64,${readFileSync(path.join(process.cwd(), "Marketing/logo-mark.png")).toString("base64")}`;
  const pairB64 = `data:image/jpeg;base64,${pairBuf.toString("base64")}`;

  const line1 = config.coverHeadlineLine1 ?? "CHARACTER SWAP";
  const line2 = config.coverHeadlineLine2 ?? "SWAP ANY MOTION IN 1 CLICK";
  const sceneDesc =
    config.coverSceneDescription ||
    "Side-by-side split-screen comparison poster based on Reference Image 2: on the LEFT half, the original performer executing a dramatic high mid-air martial-arts kick on a sunlit green hill with pad holders; on the RIGHT half, the swapped young East Asian woman (chin-length dark bob hair, pastel pink crop tank top, high-waisted blue jeans) executing the exact same mid-air high kick in the identical grassy mountain scene.";

  const prompt = [
    "Design a high-impact 9:16 vertical split-screen comparison social media poster (1152x2048, 2K resolution).",
    "1. TOP BRAND ANCHOR: At the top center, place the exact dark rounded-square app icon with the glowing neon-lime 'S' emblem from Reference Image 1.",
    "2. SPLIT-SCREEN COMPARISON LAYOUT: Divide the vertical 9:16 canvas down the center with a glowing vertical neon-lime (#A3FF47) laser beam and a circular neon-lime swap-arrows emblem in the center.",
    "3. TOP PILL BADGES: Above the left subject, place a dark rounded pill badge reading 'ORIGINAL' in bold white letters. Above the right subject, place a glowing neon-lime (#A3FF47) pill badge reading '#SCRO SWAP' in bold dark letters.",
    `4. SCENE & SUBJECTS: ${sceneDesc}`,
    `5. TORN-PAPER HEADLINE BANNER: Across the lower-middle center, render a tactile hand-torn paper collage banner (撕紙毛邊效果 with rough white fibrous torn paper edges and dark/neon-lime layered strips) reading '${line1}' in massive neon-lime (#A3FF47) bold condensed typography on the first line and '${line2}' in crisp white bold typography on the second line.`,
    "6. Crisp 2K photorealistic clarity, dramatic rim lighting, no extra watermarks.",
  ].join(" ");

  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "9:16",
    resolution: "2k",
    referenceImageUrls: [logoB64, pairB64],
  });
  const url = res.images?.[0]?.url;
  if (!url) throw new Error("Seedream 5.0 Pro returned no Swap Cover image");
  const raw = url.startsWith("data:")
    ? Buffer.from(url.split(",")[1] || "", "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  const pngBuf = await sharp(raw).resize(1152, 2048, { fit: "cover" }).png().toBuffer();

  const outDir = config.outDir || path.join(process.cwd(), "Marketing");
  mkdirSync(outDir, { recursive: true });
  const outCoverPath = path.join(outDir, `${config.name} - Cover.png`);
  writeFileSync(outCoverPath, pngBuf);
  return outCoverPath;
}

/**
 * Full End-to-End Swap Split Reel Harness (matching https://www.instagram.com/p/DfZ_hoVxyRK/)
 */
export async function runSwapSplitReelHarness(config: SwapSplitReelHarnessConfig) {
  // @ts-ignore
  const puppeteer = (await import("puppeteer")).default;
  const workDir = path.join(
    "/private/var/folders/8b/ldwp8b7x7klbv50l9qpz0jw40000gn/T/opencode/swap-split-reel",
    config.name.replace(/[^a-zA-Z0-9_-]/g, "_"),
  );
  mkdirSync(workDir, { recursive: true });

  let sourceVideoPath = config.sourceVideoPath || "";
  let swappedVideoPath = config.swappedVideoPath || "";

  if (!sourceVideoPath || !swappedVideoPath) {
    const vidCol = await videosCollection();
    const jutsuCol = await jutsuJobsCollection();
    const vidOid = ObjectId.isValid(config.videoId) ? new ObjectId(config.videoId) : null;
    const videoDoc = vidOid ? await vidCol.findOne({ _id: vidOid }) : null;
    const jutsuDoc = await jutsuCol.findOne(
      vidOid
        ? { $or: [{ targetVideoId: vidOid }, { targetVideoId: config.videoId as any }] }
        : { _id: config.videoId as any },
    );

    const srcUrl = jutsuDoc?.sourceVideoUrl;
    const outUrl =
      videoDoc?.clips?.[0]?.outputUrl ||
      videoDoc?.reelUrl ||
      jutsuDoc?.outputVideoUrl;
    if (!srcUrl || !outUrl) {
      throw new Error(`Could not resolve sourceVideoUrl / outputVideoUrl for videoId=${config.videoId}`);
    }

    if (!sourceVideoPath) {
      sourceVideoPath = path.join(workDir, "source.mp4");
      if (!existsSync(sourceVideoPath)) {
        const r = await fetch(srcUrl);
        writeFileSync(sourceVideoPath, Buffer.from(await r.arrayBuffer()));
      }
    }
    if (!swappedVideoPath) {
      swappedVideoPath = path.join(workDir, "swapped.mp4");
      if (!existsSync(swappedVideoPath)) {
        const r = await fetch(outUrl);
        writeFileSync(swappedVideoPath, Buffer.from(await r.arrayBuffer()));
      }
    }
  }

  const durationSeconds = probeVideoDurationSeconds(swappedVideoPath);
  console.log(`[Swap Harness 1/3] Recording 60fps Screen Studio session (${durationSeconds.toFixed(2)}s)...`);
  const screenStudioMp4Path = await recordSwapChromeAndExportScreenStudio(
    config,
    sourceVideoPath,
    swappedVideoPath,
    workDir,
    durationSeconds,
    puppeteer,
  );

  console.log("[Swap Harness 2/3] Compositing 1440x2560 ORIGINAL vs SWAP Split-Screen Reel...");
  const reelPath = await compositeSwapSplitReel(
    config,
    sourceVideoPath,
    swappedVideoPath,
    screenStudioMp4Path,
    workDir,
    durationSeconds,
    puppeteer,
  );

  console.log("[Swap Harness 3/3] Generating 9:16 2K Swap Split Cover via Seedream 5.0 Pro...");
  const coverPath = await generateSwapSplitReelCover(
    config,
    sourceVideoPath,
    swappedVideoPath,
    workDir,
  );

  return { sourceVideoPath, swappedVideoPath, screenStudioMp4Path, reelPath, coverPath };
}
