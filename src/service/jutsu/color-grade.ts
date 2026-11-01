import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JutsuColorSettings } from "@/model/jutsu-job";
import {
  buildJutsuColorFilter,
  DEFAULT_JUTSU_COLOR_SETTINGS,
} from "@/service/jutsu/color-settings";
import { runFfmpeg } from "@/service/reel/concat";

export {
  buildJutsuColorFilter,
  DEFAULT_JUTSU_COLOR_SETTINGS,
  DEFAULT_JUTSU_DETAIL_CONTRAST,
  DEFAULT_JUTSU_TONE,
  JUTSU_TONE_PRESETS,
} from "@/service/jutsu/color-settings";

/** Apply Openjutsu's H3 Soft color grade + detail contrast softening to an MP4 buffer via FFmpeg. */
export async function applyJutsuColorGradeBuffer(
  videoBuffer: Buffer,
  settings: JutsuColorSettings = DEFAULT_JUTSU_COLOR_SETTINGS,
): Promise<Buffer> {
  const vf = buildJutsuColorFilter(settings);
  const dir = await mkdtemp(join(tmpdir(), "jutsu-color-"));
  try {
    await writeFile(join(dir, "in.mp4"), videoBuffer);
    await runFfmpeg(dir, [
      "-y",
      "-i",
      "in.mp4",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      "out.mp4",
    ]);
    return await readFile(join(dir, "out.mp4"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
