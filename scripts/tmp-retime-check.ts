import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ffmpegStderr, runFfmpeg } from "@/service/reel/concat";
import { retimeMp4 } from "@/service/reel/retime";

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "retime-check-"));
  try {
    await runFfmpeg(dir, [
      "-y",
      "-f", "lavfi", "-i", "testsrc=duration=5:size=320x240:rate=24",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
      "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "in.mp4",
    ]);
    const out = await retimeMp4(await readFile(join(dir, "in.mp4")), 3);
    await writeFile(join(dir, "out.mp4"), out);
    const stderr = await ffmpegStderr(dir, ["-i", "out.mp4"]);
    console.log(stderr.match(/Duration: [^,]+/)?.[0], /Audio:/.test(stderr) ? "audio ok" : "no audio");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main();
