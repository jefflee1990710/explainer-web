import { CLIP_JOIN_PAD_SEC } from "@/service/reel/fade";
import type { MediaProbe } from "@/service/video-edit/probe";

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

// A still bookend becomes a short mp4 the same size as the clips, then joins by copy.
export function stillClipArgs(
  imageName: string,
  outName: string,
  frame: Pick<MediaProbe, "width" | "height" | "fps" | "hasAudio">,
  durationSec: number,
): string[] {
  const filter = [
    `scale=${frame.width}:${frame.height}:force_original_aspect_ratio=increase`,
    `crop=${frame.width}:${frame.height}`,
    "setsar=1",
    `fps=${frame.fps}`,
    "format=yuv420p",
  ].join(",");
  const args = ["-loop", "1", "-framerate", String(frame.fps), "-t", String(durationSec), "-i", imageName];
  if (frame.hasAudio) {
    args.push(
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=44100:cl=stereo",
      "-filter_complex",
      `[0:v]${filter}[v]`,
      "-map",
      "[v]",
      "-map",
      "1:a",
      "-t",
      String(durationSec),
      "-c:a",
      "aac",
    );
  } else {
    args.push("-vf", filter, "-an");
  }
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", outName);
  return args;
}
