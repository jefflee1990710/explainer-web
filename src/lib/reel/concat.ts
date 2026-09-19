import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

// Concat storyboard clips in order. Same-model renders share codec/size so
// stream-copy is enough; we never re-encode on the serverless path.
export async function concatMp4Urls(urls: string[]): Promise<Buffer> {
  if (urls.length === 0) throw new Error("沒有可合成的片段");
  if (urls.length === 1) return fetchBuffer(urls[0], "片段");
  const buffers = [];
  for (let i = 0; i < urls.length; i += 1) {
    buffers.push(await fetchBuffer(urls[i], `第 ${i + 1} 段`));
  }
  return concatMp4Buffers(buffers);
}

export async function concatMp4Buffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) throw new Error("沒有可合成的片段");
  if (buffers.length === 1) return buffers[0];

  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    const names: string[] = [];
    for (let i = 0; i < buffers.length; i += 1) {
      const name = `clip${String(i).padStart(3, "0")}.mp4`;
      await writeFile(join(dir, name), buffers[i]);
      names.push(name);
    }
    await writeFile(join(dir, "list.txt"), names.map((name) => `file '${name}'`).join("\n"));
    const out = join(dir, "reel.mp4");
    await runFfmpeg(dir, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "list.txt",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "reel.mp4",
    ]);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function fetchBuffer(url: string, label: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載${label}（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

function runFfmpeg(cwd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("找不到 ffmpeg，無法合成成片"));
      return;
    }
    const child = spawn(ffmpegPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim().split("\n").slice(-3).join(" ") || `ffmpeg 結束碼 ${code}`));
    });
  });
}
