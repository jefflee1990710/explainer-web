import { CLIP_JOIN_PAD_SEC } from "@/service/reel/fade";

// ffmpeg args for a 200ms hold of the source clip's last frame.
// The source file itself is not re-encoded; only this short pad is.
export function joinPadArgs(sourceName: string, padName: string, stderr: string): string[] {
  const fps = stderr.match(/(\d+(?:\.\d+)?) fps/)?.[1] ?? "30";
  const audio = stderr.match(/Audio:.*?(\d+) Hz,\s*(mono|stereo|\d+ channels)/);
  const filter = [
    "select=eq(n\\,0)",
    "setpts=PTS-STARTPTS",
    `tpad=stop_mode=clone:stop_duration=${CLIP_JOIN_PAD_SEC}`,
    `fps=${fps}`,
    `trim=duration=${CLIP_JOIN_PAD_SEC}`,
    "format=yuv420p",
  ].join(",");
  const args = ["-sseof", "-0.04", "-i", sourceName];
  if (audio) {
    const layout = audio[2] === "mono" || audio[2].startsWith("1") ? "mono" : "stereo";
    args.push(
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=${audio[1]}:cl=${layout}`,
      "-filter_complex",
      `[0:v]${filter}[v]`,
      "-map",
      "[v]",
      "-map",
      "1:a",
      "-t",
      String(CLIP_JOIN_PAD_SEC),
      "-c:a",
      "aac",
    );
  } else {
    args.push("-vf", filter, "-an");
  }
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", padName);
  return args;
}
