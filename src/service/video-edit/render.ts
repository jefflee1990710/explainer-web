import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchBuffer, ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { buildFinalFilter, type FinalSegmentInput } from "@/service/video-edit/final-filter";
import { layerPlacement } from "@/service/video-edit/layer-placement";
import type { BookendClip, BrandLayer, VideoEdit } from "@/model/video-edit";

export type MediaProbe = { width: number; height: number; fps: number; durationSec: number; hasAudio: boolean };

// Parse `ffmpeg -i` stderr. fps falls back to 30 when the stream omits it.
export function parseProbe(stderr: string): MediaProbe {
  const duration = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const size = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  const fps = stderr.match(/(\d+(?:\.\d+)?) fps/);
  return {
    width: size ? Number(size[1]) : 0,
    height: size ? Number(size[2]) : 0,
    fps: fps ? Number(fps[1]) : 30,
    durationSec: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0,
    hasAudio: /Audio:/.test(stderr),
  };
}

export type FinalAssetFile = { buffer: Buffer; ext: string };
export type FinalRenderInput = {
  reel: Buffer;
  layers: Array<{ file: FinalAssetFile; layer: BrandLayer }>;
  intro?: { file: FinalAssetFile; clip: BookendClip };
  outro?: { file: FinalAssetFile; clip: BookendClip };
};

// Burn brand layers into the reel and wrap it with the bookends.
export async function renderFinalFromBuffers(input: FinalRenderInput): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "final-"));
  try {
    await writeFile(join(dir, "main.mp4"), input.reel);
    const main = parseProbe(await ffmpegStderr(dir, ["-i", "main.mp4"]));
    if (!main.width || !main.height || !main.durationSec) throw new Error("無法讀取成片資訊");

    const args = ["-y", "-i", "main.mp4"];
    let nextIndex = 1;

    async function addBookend(
      slot: "intro" | "outro",
      source?: { file: FinalAssetFile; clip: BookendClip },
    ): Promise<FinalSegmentInput | undefined> {
      if (!source) return undefined;
      const name = `${slot}.${source.file.ext}`;
      await writeFile(join(dir, name), source.file.buffer);
      const index = nextIndex++;
      if (source.clip.kind === "image") {
        args.push("-loop", "1", "-framerate", String(main.fps), "-t", String(source.clip.durationSec), "-i", name);
        return { index, kind: "image", durationSec: source.clip.durationSec, hasAudio: false };
      }
      const probe = parseProbe(await ffmpegStderr(dir, ["-i", name]));
      if (!probe.durationSec) throw new Error(slot === "intro" ? "無法讀取開頭影片" : "無法讀取結尾影片");
      args.push("-i", name);
      return { index, kind: "video", durationSec: probe.durationSec, hasAudio: probe.hasAudio };
    }

    const intro = await addBookend("intro", input.intro);
    const layers = [];
    for (let i = 0; i < input.layers.length; i += 1) {
      const { file, layer } = input.layers[i];
      const name = `layer${i}.${file.ext}`;
      await writeFile(join(dir, name), file.buffer);
      args.push("-i", name);
      layers.push({
        index: nextIndex++,
        placement: layerPlacement(layer, main.width, main.height),
        opacity: layer.opacity,
      });
    }
    const outro = await addBookend("outro", input.outro);

    const { filter, hasAudio } = buildFinalFilter({
      width: main.width,
      height: main.height,
      fps: main.fps,
      main: { durationSec: main.durationSec, hasAudio: main.hasAudio },
      intro,
      outro,
      layers,
    });
    args.push("-filter_complex", filter, "-map", "[v]");
    if (hasAudio) args.push("-map", "[a]", "-c:a", "aac", "-ac", "2");
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "final.mp4");
    await runFfmpeg(dir, args);
    return await readFile(join(dir, "final.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function extOf(url: string) {
  const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "bin";
}

async function assetFile(url: string, label: string): Promise<FinalAssetFile> {
  return { buffer: await fetchBuffer(url, label), ext: extOf(url) };
}

// Download the reel and every asset, then render.
export async function renderFinalVideo(reelUrl: string, edit: VideoEdit) {
  const reel = await fetchBuffer(reelUrl, "成片");
  const layers = [];
  for (let i = 0; i < edit.layers.length; i += 1) {
    layers.push({ file: await assetFile(edit.layers[i].assetUrl, `第 ${i + 1} 個圖層`), layer: edit.layers[i] });
  }
  return renderFinalFromBuffers({
    reel,
    layers,
    intro: edit.intro ? { file: await assetFile(edit.intro.assetUrl, "開頭素材"), clip: edit.intro } : undefined,
    outro: edit.outro ? { file: await assetFile(edit.outro.assetUrl, "結尾素材"), clip: edit.outro } : undefined,
  });
}
