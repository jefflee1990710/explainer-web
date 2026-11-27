// Smart Reframe node: samples about one frame a second, asks Gemini where the main subject's
// face is in each, then renders a crop window that follows it (for example 16:9 → 9:16).

import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import { directorModel } from "@/service/director/model";
import { buildVideoCodecArgs } from "@/service/ffmpeg/video-encoder";
import { persistBuffer } from "@/service/higgsfield/persist";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { assertAllowedCanvasMediaUrl } from "@/service/canvas/execution/media-url-guard";
import { isUsableProbe, mediaMetaFromProbe, parseMediaProbe } from "@/service/canvas/core/media-meta";
import type { CanvasMediaMeta } from "@/model/canvas";
import {
  cropKeys,
  reframeCropSize,
  reframeFilter,
  reframeOutputSize,
  reframeSampleTimes,
  smoothSubjectTrack,
  type ReframeAspect,
  type SubjectSample,
} from "@/service/canvas/core/smart-reframe";

export type SubjectPoint = { x: number; y: number } | null;

export type SmartReframeDeps = {
  downloadToFile: (url: string, dest: string) => Promise<void>;
  probe: (dir: string, file: string) => Promise<string>;
  run: (dir: string, args: string[]) => Promise<void>;
  locateSubjects: (frames: Buffer[], focus: string) => Promise<SubjectPoint[]>;
  persist: (buffer: Buffer, pathname: string) => Promise<string>;
};

const TIMEOUT_MS = 15 * 60_000;

const locateSchema = z.object({
  frames: z.array(
    z.object({
      index: z.number().int().min(0),
      found: z.boolean(),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    }),
  ),
});

// One vision call for every sampled frame; a failed call keeps the center framing.
export async function locateSubjectsWithGemini(frames: Buffer[], focus: string): Promise<SubjectPoint[]> {
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: locateSchema }),
    system: [
      "You locate the main subject in video frames for a vertical reframe.",
      `Subject to follow: ${focus || "the person speaking, or the main person; if none, the most important object"}.`,
      "For each frame (numbered from 0 in the order given) return the center of that subject's face",
      "(or the object's center) as x and y fractions of the frame width and height, 0..1 from the top-left.",
      "Set found=false when the subject is not visible.",
    ].join(" "),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `${frames.length} frames follow, in order.` },
          ...frames.map((data) => ({ type: "file" as const, data, mediaType: "image/jpeg" })),
        ],
      },
    ],
  });
  const points: SubjectPoint[] = frames.map(() => null);
  for (const f of output?.frames ?? []) {
    if (f.found && f.index < points.length) points[f.index] = { x: f.x, y: f.y };
  }
  return points;
}

function defaultDeps(): SmartReframeDeps {
  return {
    downloadToFile: async (url, dest) => {
      assertAllowedCanvasMediaUrl(url);
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: "error" });
      if (!res.ok) throw new Error(`無法下載影片（HTTP ${res.status}）`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    },
    probe: (dir, file) => ffmpegStderr(dir, ["-i", file], 60_000),
    run: (dir, args) => runFfmpeg(dir, args, TIMEOUT_MS),
    locateSubjects: locateSubjectsWithGemini,
    persist: (buffer, pathname) => persistBuffer(buffer, pathname, "video/mp4"),
  };
}

export async function smartReframeVideo(
  input: {
    videoUrl: string;
    aspect: ReframeAspect;
    resolution: "720p" | "1080p";
    motion: "steady" | "follow";
    focus: string;
    pathname: string;
  },
  deps?: Partial<SmartReframeDeps>,
): Promise<{ outputUrl: string; report: string; outputMeta?: CanvasMediaMeta }> {
  const resolved = { ...defaultDeps(), ...deps };
  const dir = await mkdtemp(join(tmpdir(), "canvas-reframe-"));
  try {
    await resolved.downloadToFile(input.videoUrl, join(dir, "in.mp4"));
    const probed = parseMediaProbe(await resolved.probe(dir, "in.mp4"));
    if (!probed.width || !probed.height) throw new Error("無法讀取影片尺寸，請重新產生或重新上傳");
    if (probed.durationSec === undefined) throw new Error("無法讀取影片長度，請重新產生或重新上傳");

    const times = reframeSampleTimes(probed.durationSec);
    // One run writes every sample: select picks the frame nearest each time.
    const picks = times.map((t) => `lt(prev_pts*TB\\,${t})*gte(pts*TB\\,${t})`).join("+");
    await resolved.run(dir, [
      "-y",
      "-i",
      "in.mp4",
      "-vf",
      `select=${picks},scale=384:-2`,
      "-vsync",
      "vfr",
      "-q:v",
      "4",
      "frame-%02d.jpg",
    ]);
    const files = (await readdir(dir)).filter((f) => f.startsWith("frame-")).sort();
    const frames = await Promise.all(files.map((f) => readFile(join(dir, f))));
    const points = frames.length > 0 ? await resolved.locateSubjects(frames, input.focus).catch(() => []) : [];
    const samples: SubjectSample[] = times.map((t, i) => ({ t, x: points[i]?.x ?? null, y: points[i]?.y ?? null }));

    const crop = reframeCropSize(probed.width, probed.height, input.aspect);
    const out = reframeOutputSize(input.aspect, input.resolution);
    const track = smoothSubjectTrack(samples, input.motion);
    const keys = cropKeys(track, probed.width, probed.height, crop);
    await resolved.run(dir, [
      "-y",
      "-i",
      "in.mp4",
      "-vf",
      reframeFilter(keys, crop, out),
      ...buildVideoCodecArgs({ pixFmt: "yuv420p" }),
      ...(probed.hasAudio ? ["-c:a", "aac", "-b:a", "192k"] : ["-an"]),
      "-movflags",
      "+faststart",
      "out.mp4",
    ]);
    const outputUrl = await resolved.persist(await readFile(join(dir, "out.mp4")), input.pathname);
    const found = points.filter(Boolean).length;
    const report = `${probed.width}×${probed.height} → ${out.w}×${out.h}（${input.aspect}）\n主體 subject: ${found}/${times.length} frames`;
    const done = parseMediaProbe(await resolved.probe(dir, "out.mp4").catch(() => ""));
    return { outputUrl, report, ...(isUsableProbe(done) ? { outputMeta: mediaMetaFromProbe(outputUrl, done) } : {}) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
