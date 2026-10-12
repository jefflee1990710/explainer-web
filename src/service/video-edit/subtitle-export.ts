import { buildSubtitleOverlayFilter } from "@/service/video-edit/subtitle-placement";

// True while an overlay project still lacks a finished plate for any clip.
// Export must wait, otherwise a clip would ship without its subtitle.
export function subtitleExportBlocked(project: {
  subtitleOverlay?: boolean;
  phaseA?: { clips: Array<{ clipNumber: number }> };
  subtitlePlates?: Array<{ clipNumber: number; status?: string; blobUrl?: string }>;
}) {
  if (project.subtitleOverlay !== true) return false;
  return (project.phaseA?.clips || []).some((clip) => {
    const plate = project.subtitlePlates?.find((item) => item.clipNumber === clip.clipNumber);
    return plate?.status !== "completed" || !plate.blobUrl;
  });
}

export type SubtitleAspect = "9:16" | "16:9" | "1:1";

// Nominal frame per aspect ratio, used when the clip size is not probed.
export function subtitleFrameSize(aspect: SubtitleAspect) {
  if (aspect === "16:9") return { width: 1920, height: 1080 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  return { width: 1080, height: 1920 };
}

// ffmpeg args that burn one plate onto one clip. The still plate is looped for the clip
// length so its fade in/out has frames to work on. Audio is stream copied when present.
export function subtitleBurnArgs(input: {
  clip: string;
  plate: string;
  out: string;
  durationSec: number;
  fps: number;
  hasAudio: boolean;
  aspect: SubtitleAspect;
  width: number;
  height: number;
}) {
  const filter = buildSubtitleOverlayFilter({
    count: 1,
    hasAudio: input.hasAudio,
    durations: [input.durationSec],
    aspect: input.aspect,
    width: input.width,
    height: input.height,
  });
  const args = [
    "-i",
    input.clip,
    "-loop",
    "1",
    "-framerate",
    String(input.fps),
    "-t",
    String(input.durationSec),
    "-i",
    input.plate,
    "-filter_complex",
    filter,
    "-map",
    "[b0]",
  ];
  if (input.hasAudio) args.push("-map", "0:a", "-c:a", "copy");
  args.push(
    "-t",
    String(input.durationSec),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    input.out,
  );
  return args;
}
